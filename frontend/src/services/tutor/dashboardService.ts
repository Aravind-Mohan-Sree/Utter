import { API_ROUTES } from '~constants/routes';
import axios from '~utils/axiosConfig';

export interface TutorDashboardStats {
  totalEarnings: number;
  completedSessionsCount: number;
  totalTeachTime: number; // in seconds
  averageRating: number;
}

export interface TutorLanguageStat {
  language: string;
  sessionCount: number;
}

export interface TutorRecentBooking {
  id: string;
  sessionId: string;
  topic: string;
  language: string;
  status: string;
  date: string;
  price: number;
  otherPartyName: string;
  otherPartyAvatar: string | null;
  otherPartyId: string;
  activeSeconds: number;
}

export interface TutorRecentReview {
  id: string;
  userName: string;
  userAvatar: string | null;
  rating: number;
  note: string;
  createdAt: string;
}

export interface TutorDashboardDataResponse {
  success: boolean;
  stats: TutorDashboardStats;
  languageStats: TutorLanguageStat[];
  recentBookings: TutorRecentBooking[];
  recentReviews: TutorRecentReview[];
}

export interface TutorReviewsResponse {
  success: boolean;
  reviews: TutorRecentReview[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export const getTutorDashboardData = async (): Promise<TutorDashboardDataResponse> => {
  try {
    const res = await axios.get(API_ROUTES.TUTOR.DASHBOARD);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const getTutorOwnReviews = async (
  page: number = 1,
  limit: number = 5,
): Promise<TutorReviewsResponse> => {
  try {
    const res = await axios.get(API_ROUTES.TUTOR.REVIEWS, {
      params: { page, limit },
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};
