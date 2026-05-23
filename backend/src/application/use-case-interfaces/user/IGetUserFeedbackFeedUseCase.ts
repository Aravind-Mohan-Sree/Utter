import { FeedbackResponseDTO } from '~mappers/FeedbackMapper';

/**
 * Use case interface for retrieving infinite scroll feedback list for a student.
 */
export interface IGetUserFeedbackFeedUseCase {
  execute(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: FeedbackResponseDTO[];
    totalCount: number;
    hasMore: boolean;
  }>;
}
