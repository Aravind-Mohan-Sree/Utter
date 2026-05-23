import { Booking } from '~entities/Booking';
import { IBookingRepository } from '~repository-interfaces/IBookingRepository';
import { ISessionRepository } from '~repository-interfaces/ISessionRepository';
import { IBookWithWalletUseCase } from '~use-case-interfaces/user/IBookingUseCase';
import { BadRequestError } from '~errors/HttpError';

import { IUserRepository } from '~repository-interfaces/IUserRepository';
import { ITutorRepository } from '~repository-interfaces/ITutorRepository';
import { IMailService } from '~service-interfaces/IMailService';
import { IWalletRepository } from '~repository-interfaces/IWalletRepository';
import { IWallet } from '~models/WalletModel';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';
import { ICreateNotificationUseCase } from '~use-case-interfaces/shared/INotificationUseCase';
import { IRedisService } from '~service-interfaces/IRedisService';

/**
 * Use case to book a tutoring session using wallet balance.
 * Manages concurrency lock, verifies balance, atomically books the session,
 * deducts the wallet balance, generates a booking, and sends notifications.
 */
export class BookWithWalletUseCase implements IBookWithWalletUseCase {
  constructor(
    private _bookingRepository: IBookingRepository,
    private _sessionRepository: ISessionRepository,
    private _userRepository: IUserRepository,
    private _tutorRepository: ITutorRepository,
    private _mailService: IMailService,
    private _walletRepository: IWalletRepository,
    private _createNotificationUseCase: ICreateNotificationUseCase,
    private _redisService: IRedisService,
  ) { }

  /**
   * Performs the session booking using wallet payments.
   * Uses Redis locking to prevent double-booking.
   * 
   * @param data Object containing sessionId, userId, and tutorId.
   * @returns Promise resolving to null when complete.
   */
  async execute(data: {
    sessionId: string;
    userId: string;
    tutorId: string;
  }): Promise<null> {
    // Acquire a Redis lock on the session ID for 5 seconds to handle concurrent booking requests
    const lock = await this._redisService.acquireLock(`booking:lock:${data.sessionId}`, 5000);

    try {
      // 1. Retrieve the target session and verify its availability
      const session = await this._sessionRepository.findOneById(data.sessionId);
      if (!session) {
        throw new BadRequestError('Session not found');
      }

      if (session.status !== 'Available') {
        throw new BadRequestError('This session is no longer available.');
      }

      // 2. Retrieve user wallet and verify sufficient funds
      const wallet = await this._walletRepository.findOneByField({ userId: data.userId } as unknown as FilterQuery<IWallet>);

      if (!wallet || wallet.balance < session.price) {
        throw new BadRequestError('Insufficient wallet balance');
      }

      // Set the session link expiration date to 48 hours after the scheduled date
      const expiresAt = new Date(session.scheduledAt);
      expiresAt.setDate(expiresAt.getDate() + 2);

      // 3. Atomically update the session status to "Booked" to secure the slot
      const updatedSession = await this._sessionRepository.updateOneByField(
        { _id: data.sessionId, status: 'Available' } as Parameters<ISessionRepository['updateOneByField']>[0],
        { status: 'Booked', expiresAt },
      );

      if (!updatedSession) {
        throw new BadRequestError('This session was just booked by someone else.');
      }

      // 4. Deduct transaction price from user's wallet balance and record transaction
      wallet.balance -= session.price;
      wallet.transactions.push({
        amount: session.price,
        type: 'debit',
        description: `Paid for session: ${session.topic}`,
        date: new Date(),
      });

      await this._walletRepository.updateOneById(wallet.id!, wallet);

      // 5. Create a new Booking entity in "confirmed" status paid by "wallet"
      const booking = new Booking(
        data.sessionId,
        data.userId,
        data.tutorId,
        {
          provider: 'wallet',
          transactionId: `WAL-${Date.now()}`,
          status: 'success',
          currency: wallet.currency,
        },
        'confirmed',
        0,
        session.topic,
        session.language,
        session.price,
      );

      await this._bookingRepository.create(booking);

      // 6. Fetch user and tutor details to dispatch emails and system notifications
      const [user, tutor] = await Promise.all([
        this._userRepository.findOneById(data.userId),
        this._tutorRepository.findOneById(data.tutorId),
      ]);

      if (user && tutor) {
        const formattedDate = new Date(session.scheduledAt).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Trigger confirmation emails and in-app system notifications to both parties
        await Promise.all([
          this._mailService.sendBookingConfirmation(tutor.name, tutor.email, session.topic, session.language, formattedDate, true),
          this._mailService.sendBookingConfirmation(user.name, user.email, session.topic, session.language, formattedDate, false),
          this._createNotificationUseCase.execute({
            recipientId: tutor.id!,
            recipientRole: 'tutor',
            message: `${user.name} booked your session on ${session.topic}`,
            type: 'booking',
          }),
        ]);
      }

      return null;
    } finally {
      // 7. Cleanup: release Redis lock and delete the pending booking cache key
      await Promise.all([
        this._redisService.releaseLock(lock),
        this._redisService.delete(`booking:pending:${data.sessionId}`),
      ]);
    }
  }
}
