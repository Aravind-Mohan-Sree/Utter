import { IBookingRepository } from '~repository-interfaces/IBookingRepository';
import { ISessionRepository } from '~repository-interfaces/ISessionRepository';
import { IRedisService } from '~service-interfaces/IRedisService';
import { env } from '~config/env';
import { IPingBookingUseCase } from '~use-case-interfaces/shared/IPingBookingUseCase';
import { SocketManager } from '~concrete-services/SocketManager';
import { IWalletRepository } from '~repository-interfaces/IWalletRepository';
import { Wallet } from '~entities/Wallet';
import { IWallet } from '~models/WalletModel';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';
import { logger } from '~logger/logger';
import { NotFoundError, ForbiddenError } from '~errors/HttpError';

/**
 * Use case to handle periodic pings from students and tutors during a live session.
 * Tracks session activity, handles auto-completion based on time thresholds,
 * manages tutor payments (wallet credits), and emits real-time completion events.
 */
export class PingBookingUseCase implements IPingBookingUseCase {
  constructor(
    private _bookingRepository: IBookingRepository,
    private _sessionRepository: ISessionRepository,
    private _redisService: IRedisService,
    private _walletRepository: IWalletRepository,
  ) { }

  /**
   * Records a ping and checks if the session requirements for completion are met.
   * @param bookingId The ID of the active booking.
   * @param userId The ID of the user requesting the ping.
   * @param role The role of the person pinging (user/tutor).
   * @returns Completion status.
   */
  async execute(bookingId: string, userId: string, role: string) {
    const booking = await this._bookingRepository.findOneById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Authorization check: only the student or tutor for this booking can ping
    if (role === 'user' && booking.userId !== userId) {
      throw new ForbiddenError('Not authorized');
    }
    if (role === 'tutor' && booking.tutorId !== userId) {
      throw new ForbiddenError('Not authorized');
    }

    // Register the current user's activity in Redis with a short TTL (15s)
    const pingKey = `booking_ping:${bookingId}:${role}`;
    await this._redisService.set(pingKey, '1', 15);

    // Check if the other participant is also active
    const otherRole = role === 'user' ? 'tutor' : 'user';
    const otherPingKey = `booking_ping:${bookingId}:${otherRole}`;
    const isOtherActive = await this._redisService.get(otherPingKey);

    let completed = false;

    // Completion logic is driven by the tutor's ping when the student is also active
    if (isOtherActive && role === 'tutor') {
      if (booking.status === 'Completed') {
        return { completed: true };
      }

      // Check the required duration for a session to be considered "completed"
      const thresholdMinutes = env.SESSION_COMPLETION_THRESHOLD_MINUTES !== undefined
        ? Number(env.SESSION_COMPLETION_THRESHOLD_MINUTES)
        : 50;

      if (thresholdMinutes === 0) {
        // Immediate completion if threshold is 0
        await this._bookingRepository.updateOneById(bookingId, { status: 'Completed' });
        await this._sessionRepository.updateOneById(booking.sessionId, { status: 'Completed' });
        completed = true;
      } else {
        // Increment active duration tracking (pings happen every 5 seconds)
        const thresholdMs = thresholdMinutes * 60 * 1000;
        const currentActiveSeconds = booking.activeSeconds || 0;
        const newActiveSeconds = currentActiveSeconds + 5;

        await this._bookingRepository.updateOneById(bookingId, { activeSeconds: newActiveSeconds });

        // If threshold reached, finalize the session
        if (newActiveSeconds * 1000 >= thresholdMs) {
          await this._bookingRepository.updateOneById(bookingId, { status: 'Completed' });
          await this._sessionRepository.updateOneById(booking.sessionId, { status: 'Completed' });
          completed = true;
        }
      }

      // If session just completed, trigger payments and notifications
      if (completed) {
        try {
          // Credit the tutor's wallet
          let wallet = await this._walletRepository.findOneByField({ userId: booking.tutorId } as unknown as FilterQuery<IWallet>);

          if (!wallet) {
            wallet = new Wallet(booking.tutorId, 0, 'INR', []);
            wallet = await this._walletRepository.create(wallet);
          }

          const creditAmount = booking.price;
          wallet.balance += creditAmount;
          wallet.transactions.push({
            amount: creditAmount,
            type: 'credit',
            description: `Payment for completed session: ${booking.topic}`,
            date: new Date(),
          });

          await this._walletRepository.updateOneById(wallet.id!, wallet);
        } catch (walletError) {
          logger.error('Failed to credit tutor wallet upon session completion', walletError);
        }

        try {
          // Emit completion event to both participants for UI update
          const sm = SocketManager.getInstance();
          const io = sm.getIO();
          const uSocket = sm.getSocketId(booking.userId);
          const tSocket = sm.getSocketId(booking.tutorId);
                    
          if (uSocket) io.to(uSocket).emit('session_completed');
          if (tSocket) io.to(tSocket).emit('session_completed');
        } catch (err) {
          logger.error('Failed to emit session_completed socket event', err);
        }
      }
    } else {
      // If student is pinging or other is not active, just check current status
      if (booking.status === 'Completed') {
        completed = true;
      }
    }

    return { completed };
  }
}
