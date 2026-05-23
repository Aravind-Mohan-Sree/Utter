export interface TutorDashboardStatsDTO {
  totalEarnings: number;
  completedSessionsCount: number;
  totalTeachTime: number; // active seconds
  averageRating: number;
}

export interface TutorLanguageStatDTO {
  language: string;
  sessionCount: number;
}

export interface TutorRecentBookingDTO {
  id: string;
  sessionId: string;
  topic: string;
  language: string;
  status: string;
  date: Date;
  price: number;
  otherPartyName: string;
  otherPartyAvatar: string | null;
  otherPartyId: string;
  activeSeconds: number;
}

export interface TutorRecentReviewDTO {
  id: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  note: string;
  createdAt: Date;
}

export interface TutorDashboardResponseDTO {
  stats: TutorDashboardStatsDTO;
  languageStats: TutorLanguageStatDTO[];
  recentBookings: TutorRecentBookingDTO[];
  recentReviews: TutorRecentReviewDTO[];
}
