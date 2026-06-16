import { IBookingRepository } from '~repository-interfaces/IBookingRepository';
import { ISessionRepository } from '~repository-interfaces/ISessionRepository';
import { IUserRepository } from '~repository-interfaces/IUserRepository';
import { ITutorRepository } from '~repository-interfaces/ITutorRepository';
import { IWalletRepository } from '~repository-interfaces/IWalletRepository';
import { IRescheduleBookingUseCase } from '~use-case-interfaces/shared/IRescheduleBookingUseCase';
import { ICreateNotificationUseCase } from '~use-case-interfaces/shared/INotificationUseCase';
import { IMailService } from '~service-interfaces/IMailService';
import { IRedisService } from '~service-interfaces/IRedisService';
import { NotFoundError, ForbiddenError, BadRequestError } from '~errors/HttpError';
import { IWallet } from '~models/WalletModel';
import { Wallet } from '~entities/Wallet';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';

export class RescheduleBookingUseCase implements IRescheduleBookingUseCase {
  constructor(
    private _bookingRepository: IBookingRepository,
    private _sessionRepository: ISessionRepository,
    private _userRepository: IUserRepository,
    private _tutorRepository: ITutorRepository,
    private _walletRepository: IWalletRepository,
    private _mailService: IMailService,
    private _createNotificationUseCase: ICreateNotificationUseCase,
    private _redisService: IRedisService,
  ) {}

  async execute(bookingId: string, newSessionId: string, userId: string, role: string): Promise<boolean> {
    // Acquire Redis locks to prevent concurrent booking updates and double booking of the target slot
    const rescheduleLock = await this._redisService.acquireLock(`reschedule:lock:${bookingId}`, 5000);
    const targetSessionLock = await this._redisService.acquireLock(`booking:lock:${newSessionId}`, 5000);

    try {
      // 1. Fetch booking
      const booking = await this._bookingRepository.findOneById(bookingId);
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      // 2. Authorization check
      if (role === 'user' && booking.userId !== userId) {
        throw new ForbiddenError('Not authorized');
      }
      if (role === 'tutor' && booking.tutorId !== userId) {
        throw new ForbiddenError('Not authorized');
      }

      // 3. Verify status
      if (booking.status !== 'confirmed') {
        throw new BadRequestError('Only confirmed bookings can be rescheduled');
      }

      // Check reschedule count limit
      if (booking.rescheduleCount >= 3) {
        throw new BadRequestError('Rescheduling limit reached. You can only reschedule a booking up to 3 times.');
      }

      // 4. Retrieve old session
      const oldSession = await this._sessionRepository.findOneById(booking.sessionId);
      if (!oldSession) {
        throw new NotFoundError('Old session not found');
      }

      // 5. Verification: Time limit (at least 1 hour before scheduled time)
      const now = new Date();
      const scheduledTime = new Date(oldSession.scheduledAt);
      const oneHourBefore = new Date(scheduledTime.getTime() - 60 * 60 * 1000);
      if (now > oneHourBefore) {
        throw new ForbiddenError('Rescheduling is only allowed up to 1 hour before the session.');
      }

      // 6. Retrieve new session
      const newSession = await this._sessionRepository.findOneById(newSessionId);
      if (!newSession) {
        throw new NotFoundError('Target session not found');
      }

      // 7. Verification: availability
      if (newSession.status !== 'Available') {
        throw new BadRequestError('The target session is no longer available.');
      }

      // 8. Verification: same tutor
      if (newSession.tutorId.toString() !== booking.tutorId.toString()) {
        throw new BadRequestError('Cannot reschedule session to a different tutor');
      }

      // 9. Verification: target session is in the future and at least 1 hour from now
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      if (newSession.scheduledAt.getTime() < oneHourFromNow.getTime()) {
        throw new BadRequestError('Cannot reschedule to a session starting in less than 1 hour');
      }

      // 10. Handle wallet adjustments based on price difference
      const diff = newSession.price - oldSession.price;
      let wallet = await this._walletRepository.findOneByField({ userId: booking.userId } as unknown as FilterQuery<IWallet>);

      if (diff !== 0) {
        if (!wallet) {
          wallet = new Wallet(booking.userId, 0, 'INR', []);
          wallet = await this._walletRepository.create(wallet);
        }

        if (diff > 0) {
          // New session is more expensive, charge user the difference
          if (wallet.balance < diff) {
            throw new BadRequestError('Insufficient wallet balance for reschedule price difference');
          }
          wallet.balance -= diff;
          wallet.transactions.push({
            amount: diff,
            type: 'debit',
            description: `Charged difference for rescheduling session to ${newSession.topic}`,
            date: new Date(),
          });
        } else {
          // New session is cheaper, refund user the difference
          const refundAmount = Math.abs(diff);
          wallet.balance += refundAmount;
          wallet.transactions.push({
            amount: refundAmount,
            type: 'credit',
            description: `Refunded difference for rescheduling session to ${newSession.topic}`,
            date: new Date(),
          });
        }

        await this._walletRepository.updateOneById(wallet.id!, wallet);
      }

      // 11. Update old session: set status back to Available and reset expiresAt (scheduledAt - 30 mins)
      const oldExpiresAt = new Date(oldSession.scheduledAt.getTime() - 30 * 60000);
      await this._sessionRepository.updateOneById(oldSession.id!, {
        status: 'Available',
        expiresAt: oldExpiresAt,
      });

      // 12. Update new session: set status to Booked and expiresAt (scheduledAt + 2 days)
      const newExpiresAt = new Date(newSession.scheduledAt);
      newExpiresAt.setDate(newExpiresAt.getDate() + 2);
      await this._sessionRepository.updateOneById(newSession.id!, {
        status: 'Booked',
        expiresAt: newExpiresAt,
      });

      // 13. Update booking details to point to the new session and increment reschedule count
      await this._bookingRepository.updateOneById(bookingId, {
        sessionId: newSession.id,
        price: newSession.price,
        topic: newSession.topic,
        language: newSession.language,
        rescheduleCount: booking.rescheduleCount + 1,
      });

      // 14. Fetch user and tutor details to send emails and notifications
      const [user, tutor] = await Promise.all([
        this._userRepository.findOneById(booking.userId),
        this._tutorRepository.findOneById(booking.tutorId),
      ]);

      if (user && tutor) {
        const formattedOldDate = new Date(oldSession.scheduledAt).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const formattedNewDate = new Date(newSession.scheduledAt).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Trigger notifications and emails based on who initiated the reschedule
        if (role === 'tutor') {
          // Tutor rescheduled, notify student (user)
          await Promise.all([
            this._mailService.sendBookingRescheduled(user.name, user.email, newSession.topic, newSession.language, formattedOldDate, formattedNewDate),
            this._createNotificationUseCase.execute({
              recipientId: user.id!,
              recipientRole: 'user',
              message: `${tutor.name} rescheduled your session on ${oldSession.topic} to ${formattedNewDate}`,
              type: 'booking',
            }),
          ]);
        } else {
          // Student (user) rescheduled, notify tutor
          await Promise.all([
            this._mailService.sendBookingRescheduled(tutor.name, tutor.email, newSession.topic, newSession.language, formattedOldDate, formattedNewDate),
            this._createNotificationUseCase.execute({
              recipientId: tutor.id!,
              recipientRole: 'tutor',
              message: `${user.name} rescheduled their session on ${oldSession.topic} to ${formattedNewDate}`,
              type: 'booking',
            }),
          ]);
        }
      }

      return true;
    } finally {
      // 15. Release locks
      await Promise.all([
        this._redisService.releaseLock(rescheduleLock),
        this._redisService.releaseLock(targetSessionLock),
        this._redisService.delete(`booking:pending:${newSessionId}`),
      ]);
    }
  }
}
