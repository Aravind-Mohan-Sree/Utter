import { FeedbackResponseDTO } from '~mappers/FeedbackMapper';

/**
 * Use case interface for retrieving feedback associated with a booking.
 */
export interface IGetFeedbackUseCase {
  execute(
    userId: string,
    role: string,
    bookingId: string,
  ): Promise<FeedbackResponseDTO | null>;
}
