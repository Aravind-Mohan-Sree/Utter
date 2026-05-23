import { SubmitFeedbackDTO } from '~dtos/SubmitFeedbackDTO';
import { FeedbackResponseDTO } from '~mappers/FeedbackMapper';

/**
 * Use case interface for submitting tutor-to-student feedback.
 */
export interface ISubmitFeedbackUseCase {
  execute(
    tutorId: string,
    dto: SubmitFeedbackDTO,
  ): Promise<FeedbackResponseDTO>;
}
