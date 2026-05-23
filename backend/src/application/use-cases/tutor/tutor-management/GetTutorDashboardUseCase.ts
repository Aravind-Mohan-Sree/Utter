import { IGetTutorDashboardUseCase } from '~use-case-interfaces/tutor/IGetTutorDashboardUseCase';
import { IBookingRepository } from '~repository-interfaces/IBookingRepository';
import { IReviewRepository } from '~repository-interfaces/IReviewRepository';
import { TutorDashboardResponseDTO } from '~dtos/TutorDashboardDTO';
import mongoose from 'mongoose';

export class GetTutorDashboardUseCase implements IGetTutorDashboardUseCase {
  constructor(
    private _bookingRepo: IBookingRepository,
    private _reviewRepo: IReviewRepository,
  ) {}

  async execute(tutorId: string): Promise<TutorDashboardResponseDTO> {
    // 1. Fetch tutor booking statistics (earnings, count, teach time, and language stats)
    const statsResult = await this._bookingRepo.getTutorDashboardStats(tutorId);

    // 2. Fetch tutor average rating
    const averageRating = await this._reviewRepo.getAverageRating(tutorId);

    // 3. Fetch tutor recent bookings (limit 5) using fetchBookings
    const bookingsResult = await this._bookingRepo.fetchBookings({
      tutorId,
      limit: 5,
    });

    // 4. Fetch tutor recent reviews (limit 5)
    const reviews = await this._reviewRepo.findAllByField(
      { tutorId: new mongoose.Types.ObjectId(tutorId) },
      { limit: 5 },
    );
    const reviewsList = reviews || [];

    // 5. Map everything into TutorDashboardResponseDTO
    return {
      stats: {
        totalEarnings: statsResult.totalEarnings,
        completedSessionsCount: statsResult.completedSessionsCount,
        totalTeachTime: statsResult.totalTeachTime,
        averageRating,
      },
      languageStats: statsResult.languageStats,
      recentBookings: bookingsResult.history.data.map((booking) => ({
        id: booking.id,
        sessionId: booking.sessionId,
        topic: booking.topic,
        language: booking.language,
        status: booking.status,
        date: booking.date,
        price: booking.price,
        otherPartyName: booking.otherPartyName,
        otherPartyAvatar: booking.otherPartyAvatar,
        otherPartyId: booking.otherPartyId,
        activeSeconds: booking.activeSeconds,
      })),
      recentReviews: reviewsList.map((review) => ({
        id: review.id || '',
        userName: review.userName || 'Anonymous',
        userAvatar: review.userAvatar || null,
        rating: review.rating,
        note: review.note,
        createdAt: review.createdAt,
      })),
    };
  }
}
