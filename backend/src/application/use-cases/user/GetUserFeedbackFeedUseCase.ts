import { IGetUserFeedbackFeedUseCase } from '~use-case-interfaces/user/IGetUserFeedbackFeedUseCase';
import { IFeedbackRepository } from '~repository-interfaces/IFeedbackRepository';
import { FeedbackMapper, FeedbackResponseDTO } from '~mappers/FeedbackMapper';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';
import { IFeedback } from '~models/FeedbackModel';

/**
 * Use case to fetch a paginated stream of tutor feedbacks for a specific user (student).
 * Used for infinite scrolling elements in the student dashboard.
 */
export class GetUserFeedbackFeedUseCase implements IGetUserFeedbackFeedUseCase {
  constructor(private _feedbackRepository: IFeedbackRepository) {}

  async execute(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{
    data: FeedbackResponseDTO[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    // 1. Fetch paginated feedback entities sorted by newest (default sorting handled in repository)
    const feedbacks = await this._feedbackRepository.findAllByField(
      { userId } as unknown as FilterQuery<IFeedback>,
      { skip, limit },
    );

    // 2. Count total feedback documents for pagination status
    const totalCount = await this._feedbackRepository.countDocuments({
      userId,
    } as unknown as FilterQuery<IFeedback>);

    const data = feedbacks ? FeedbackMapper.toResponseList(feedbacks) : [];
    const hasMore = skip + data.length < totalCount;

    return {
      data,
      totalCount,
      hasMore,
    };
  }
}
