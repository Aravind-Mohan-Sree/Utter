import { Booking } from '~entities/Booking';
import { IBookingRepository } from '~repository-interfaces/IBookingRepository';
import { ISessionRepository } from '~repository-interfaces/ISessionRepository';
import { IPaymentService } from '~service-interfaces/IPaymentService';
import { IVerifyPaymentAndBookUseCase } from '~use-case-interfaces/user/IBookingUseCase';
import { BadRequestError } from '~errors/HttpError';

import { IUserRepository } from '~repository-interfaces/IUserRepository';
import { ITutorRepository } from '~repository-interfaces/ITutorRepository';
import { IMailService } from '~service-interfaces/IMailService';
import { IWalletRepository } from '~repository-interfaces/IWalletRepository';
import { Wallet } from '~entities/Wallet';
import { IWallet } from '~models/WalletModel';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';
import { ICreateNotificationUseCase } from '~use-case-interfaces/shared/INotificationUseCase';
import { IRedisService } from '~service-interfaces/IRedisService';

export class VerifyPaymentAndBookUseCase implements IVerifyPaymentAndBookUseCase {
  constructor(
    private _bookingRepository: IBookingRepository,
    private _sessionRepository: ISessionRepository,
    private _userRepository: IUserRepository,
    private _tutorRepository: ITutorRepository,
    private _paymentService: IPaymentService,
    private _mailService: IMailService,
    private _walletRepository: IWalletRepository,
    private _createNotificationUseCase: ICreateNotificationUseCase,
    private _redisService: IRedisService,
  ) { }

  async execute(data: {
    orderId: string;
    paymentId: string;
    signature: string;
    sessionId: string;
    userId: string;
    tutorId: string;
    amount: number;
    currency: string;
  }): Promise<null> {
    const isValid = this._paymentService.verifySignature(data.orderId, data.paymentId, data.signature);

    if (!isValid) {
      throw new BadRequestError('Invalid payment signature');
    }

    const lock = await this._redisService.acquireLock(`booking:lock:${data.sessionId}`, 5000);

    try {
      const session = await this._sessionRepository.findOneById(data.sessionId);
      if (!session) {
        throw new BadRequestError('Session not found');
      }

      if (session.status !== 'Available') {
        throw new BadRequestError('This session is no longer available.');
      }

      const expiresAt = new Date(session.scheduledAt);
      expiresAt.setDate(expiresAt.getDate() + 2);

      const updatedSession = await this._sessionRepository.updateOneByField(
        { _id: data.sessionId, status: 'Available' } as Parameters<ISessionRepository['updateOneByField']>[0],
        { status: 'Booked', expiresAt },
      );

      if (!updatedSession) {
        let wallet = await this._walletRepository.findOneByField({ userId: data.userId } as unknown as FilterQuery<IWallet>);

        if (!wallet) {
          wallet = new Wallet(data.userId, 0, 'INR', []);
          wallet = await this._walletRepository.create(wallet);
        }

        const refundAmount = session.price;

        wallet.balance += refundAmount;
        wallet.transactions.push({
          amount: refundAmount,
          type: 'credit',
          description: `Refund for failed booking (Session already taken): ${session.topic}`,
          date: new Date(),
        });

        await this._walletRepository.updateOneById(wallet.id!, wallet);

        throw new BadRequestError('This session was just booked by someone else. The amount has been refunded to your wallet.');
      }

      const booking = new Booking(
        data.sessionId,
        data.userId,
        data.tutorId,
        {
          provider: 'razorpay',
          transactionId: data.paymentId,
          status: 'success',
          currency: data.currency,
        },
        'confirmed',
        0,
        session.topic,
        session.language,
        session.price,
      );

      await this._bookingRepository.create(booking);

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
      await Promise.all([
        this._redisService.releaseLock(lock),
        this._redisService.delete(`booking:pending:${data.sessionId}`),
      ]);
    }
  }
}
