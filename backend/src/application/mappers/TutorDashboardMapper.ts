import { TutorDashboardResponseDTO } from '~dtos/TutorDashboardDTO';

export class TutorDashboardMapper {
  static toResponse(data: TutorDashboardResponseDTO): TutorDashboardResponseDTO {
    return {
      stats: {
        totalEarnings: data.stats.totalEarnings,
        completedSessionsCount: data.stats.completedSessionsCount,
        totalTeachTime: data.stats.totalTeachTime,
        averageRating: data.stats.averageRating,
      },
      languageStats: data.languageStats.map((lang) => ({
        language: lang.language,
        sessionCount: lang.sessionCount,
      })),
      recentBookings: data.recentBookings.map((booking) => ({
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
      recentReviews: data.recentReviews.map((review) => ({
        id: review.id,
        userName: review.userName,
        userAvatar: review.userAvatar,
        rating: review.rating,
        note: review.note,
        createdAt: review.createdAt,
      })),
    };
  }
}
