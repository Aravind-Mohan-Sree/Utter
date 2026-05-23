import { IBookingRepository } from "~repository-interfaces/IBookingRepository";
import { ISessionRepository } from "~repository-interfaces/ISessionRepository";
import { IWalletRepository } from "~repository-interfaces/IWalletRepository";
import { IGetBookingsUseCase } from "~use-case-interfaces/shared/IGetBookingsUseCase";
import { BookingMapper, BookingResponseDTO } from "~mappers/BookingMapper";
import { GetBookingsDTO } from "~dtos/GetBookingsDTO";
import { Wallet } from "~entities/Wallet";
import { IWallet } from "~models/WalletModel";
import { IBooking } from "~models/BookingModel";
import { FilterQuery } from "~repository-interfaces/IBaseRepository";

/**
 * Use case to retrieve bookings for users or tutors.
 * Automatically processes refund/payout rules for past unattended/incomplete sessions,
 * updates wallet balances accordingly, and separates bookings into upcoming vs past history.
 */
export class GetBookingsUseCase implements IGetBookingsUseCase {
  constructor(
    private _bookingRepo: IBookingRepository,
    private _sessionRepo: ISessionRepository,
    private _walletRepo: IWalletRepository,
  ) { }

  /**
   * Fetches, evaluates, and returns categorized bookings.
   * Runs auto-refund/payout logic for confirmed bookings that started more than 1 hour ago.
   * 
   * @param req GetBookingsDTO including filters and pagination parameters.
   * @returns Split lists of upcoming and completed/incomplete history bookings.
   */
  async execute(req: GetBookingsDTO): Promise<{
    upcoming: BookingResponseDTO[];
    history: {
      data: BookingResponseDTO[];
      totalPage: number;
      currentPage: number;
      totalCount: number;
    };
    callJoinThresholdMinutes: number;
  }> {
    const now = new Date();
    // Sessions scheduled more than 1 hour ago are considered candidates for past incomplete sessions
    const historyThreshold = new Date(now.getTime() - 60 * 60 * 1000);

    // 1. Fetch all confirmed bookings to evaluate for auto-payout/refund split
    const confirmedBookings = await this._bookingRepo.findAllByField({ status: "confirmed" });
    if (confirmedBookings && confirmedBookings.length > 0) {
      for (const booking of confirmedBookings) {
        const session = await this._sessionRepo.findOneById(booking.sessionId);
        if (!session) {
          continue;
        }

        const scheduledTime = new Date(session.scheduledAt);
        // Check if the scheduled session start time is past the 1-hour window
        if (scheduledTime <= historyThreshold) {
          // Atomically update the booking status to "Incomplete" to ensure only one concurrent thread processes the wallet logic
          const updatedBooking = await this._bookingRepo.updateOneByField(
            { _id: booking.id, status: "confirmed" } as unknown as FilterQuery<IBooking>,
            { status: "Incomplete" },
          );

          if (updatedBooking) {
            // Mark the session itself as Incomplete
            await this._sessionRepo.updateOneById(session.id!, { status: "Incomplete" });

            const activeSeconds = booking.activeSeconds || 0;
            const activeMinutes = activeSeconds / 60;
            const price = booking.price;

            let refundUser = 0;
            let payoutTutor = 0;

            // Apply active call duration refund/split criteria:
            // - 0 to 15 min: Full refund to user
            // - 15 to 30 min: 50% refund to user, 50% payout to tutor
            // - above 30 min: Full payout to tutor
            if (activeMinutes < 15) {
              refundUser = price;
              payoutTutor = 0;
            } else if (activeMinutes <= 30) {
              refundUser = price / 2;
              payoutTutor = price / 2;
            } else {
              refundUser = 0;
              payoutTutor = price;
            }

            // Process user's refund if eligible
            if (refundUser > 0) {
              let userWallet = await this._walletRepo.findOneByField({ userId: booking.userId } as unknown as FilterQuery<IWallet>);
              if (!userWallet) {
                userWallet = new Wallet(booking.userId, 0, "INR", []);
                userWallet = await this._walletRepo.create(userWallet);
              }
              userWallet.balance += refundUser;
              userWallet.transactions.push({
                amount: refundUser,
                type: "credit",
                description: `Refund (Incomplete Session): ${booking.topic}`,
                date: new Date(),
              });
              await this._walletRepo.updateOneById(userWallet.id!, userWallet);
            }

            // Process tutor's payout if eligible
            if (payoutTutor > 0) {
              let tutorWallet = await this._walletRepo.findOneByField({ userId: booking.tutorId } as unknown as FilterQuery<IWallet>);
              if (!tutorWallet) {
                tutorWallet = new Wallet(booking.tutorId, 0, "INR", []);
                tutorWallet = await this._walletRepo.create(tutorWallet);
              }
              tutorWallet.balance += payoutTutor;
              tutorWallet.transactions.push({
                amount: payoutTutor,
                type: "credit",
                description: `Payout (Incomplete Session): ${booking.topic}`,
                date: new Date(),
              });
              await this._walletRepo.updateOneById(tutorWallet.id!, tutorWallet);
            }
          }
        }
      }
    }

    // 2. Fetch the finalized raw booking lists from repository aggregation
    const result = await this._bookingRepo.fetchBookings(req);

    // 3. Map entities to clean response DTOs
    return {
      upcoming: result.upcoming.map(booking => BookingMapper.toResponse(booking)),
      history: {
        ...result.history,
        data: result.history.data.map(booking => BookingMapper.toResponse(booking)),
        totalCount: result.history.totalCount,
      },
      callJoinThresholdMinutes: result.callJoinThresholdMinutes,
    };
  }
}
