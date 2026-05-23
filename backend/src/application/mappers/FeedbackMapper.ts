import { Feedback } from '~entities/Feedback';

/**
 * Data Transfer Object interface for Feedback responses.
 */
export interface FeedbackResponseDTO {
  id: string | undefined;
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
  createdAt: Date;
  updatedAt: Date;
  tutorName?: string;
  tutorAvatar?: string;
}

/**
 * Mapper class to transform Feedback domain entities into clean API responses.
 */
export class FeedbackMapper {
  static toResponse(feedback: Feedback): FeedbackResponseDTO {
    return {
      id: feedback.id,
      bookingId: feedback.bookingId,
      userId: feedback.userId,
      tutorId: feedback.tutorId,
      language: feedback.language,
      topic: feedback.topic,
      rating: feedback.rating,
      grammar: feedback.grammar,
      vocabulary: feedback.vocabulary,
      pronunciation: feedback.pronunciation,
      speaking: feedback.speaking,
      notes: feedback.notes,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
      tutorName: feedback.tutorName,
      tutorAvatar: feedback.tutorAvatar,
    };
  }

  static toResponseList(feedbacks: Feedback[]): FeedbackResponseDTO[] {
    return feedbacks.map((feedback) => this.toResponse(feedback));
  }
}
