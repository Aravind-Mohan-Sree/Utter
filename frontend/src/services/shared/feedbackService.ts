import { API_ROUTES } from '~constants/routes';
import axios from '~utils/axiosConfig';

export interface Feedback {
  id?: string;
  bookingId: string;
  userId: string;
  tutorId: string;
  language: string;
  topic: string;
  rating: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  speaking: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  tutorName?: string;
}

export interface FeedbackFeedResponse {
  success: boolean;
  data: Feedback[];
  totalCount: number;
  hasMore: boolean;
}

export interface LanguageProgress {
  language: string;
  sessionCount: number;
  averageRating: number;
  averageGrammar: number;
  averageVocabulary: number;
  averagePronunciation: number;
  averageSpeaking: number;
  history: {
    date: string;
    rating: number;
  }[];
}

/**
 * Service to handle frontend API operations for the feedback system.
 */
export const submitFeedback = async (data: {
  bookingId: string;
  rating: number;
  grammar: number;
  vocabulary: number;
  pronunciation: number;
  speaking: number;
  notes: string;
}): Promise<{ success: boolean; message: string; feedback: Feedback }> => {
  const res = await axios.post(API_ROUTES.TUTOR.FEEDBACK, data);
  return res.data;
};

/**
 * Fetches feedback associated with a booking.
 */
export const getFeedbackByBooking = async (
  bookingId: string,
  role: 'user' | 'tutor',
): Promise<{ success: boolean; feedback: Feedback | null }> => {
  const url =
    role === 'tutor'
      ? API_ROUTES.TUTOR.FEEDBACK_BOOKING(bookingId)
      : API_ROUTES.USER.FEEDBACK_BOOKING(bookingId);
  const res = await axios.get(url);
  return res.data;
};

/**
 * Fetches an infinite-scroll feed of feedback given by tutors.
 */
export const getUserFeedbackFeed = async (
  page: number = 1,
  limit: number = 10,
): Promise<FeedbackFeedResponse> => {
  const res = await axios.get(API_ROUTES.USER.FEEDBACK_FEED, {
    params: { page, limit },
  });
  return res.data;
};

/**
 * Fetches aggregated language progress metrics for the student.
 */
export const getUserLanguageProgress = async (): Promise<{
  success: boolean;
  progress: LanguageProgress[];
}> => {
  const res = await axios.get(API_ROUTES.USER.FEEDBACK_PROGRESS);
  return res.data;
};
