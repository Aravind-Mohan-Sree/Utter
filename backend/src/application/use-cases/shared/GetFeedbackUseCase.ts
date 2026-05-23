import { IGetFeedbackUseCase } from '~use-case-interfaces/shared/IGetFeedbackUseCase';
import { IBookingRepository } from '~repository-interfaces/IBookingRepository';
import { IFeedbackRepository } from '~repository-interfaces/IFeedbackRepository';
import { FeedbackMapper, FeedbackResponseDTO } from '~mappers/FeedbackMapper';
import { NotFoundError, ForbiddenError } from '~errors/HttpError';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';
import { IFeedback } from '~models/FeedbackModel';

/**
 * Use case to retrieve feedback for a specific booking.
 * Verifies that the requester is a participant (user or tutor) of the session,
 * and fetches the feedback if present.
 */
export class GetFeedbackUseCase implements IGetFeedbackUseCase {
  constructor(
    private _feedbackRepository: IFeedbackRepository,
    private _bookingRepository: IBookingRepository,
  ) {}

  async execute(
    userId: string,
    role: string,
    bookingId: string,
  ): Promise<FeedbackResponseDTO | null> {
    // 1. Fetch the target booking
    const booking = await this._bookingRepository.findOneById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // 2. Authorization check: must be the student or tutor for this booking
    if (booking.userId !== userId && booking.tutorId !== userId) {
      throw new ForbiddenError('You are not authorized to view feedback for this session');
    }

    // 3. Find the feedback document in the database
    const feedback = await this._feedbackRepository.findOneByField({
      bookingId: booking.id,
    } as unknown as FilterQuery<IFeedback>);

    if (!feedback) {
      return null;
    }

    // 4. Return mapped DTO response
    return FeedbackMapper.toResponse(feedback);
  }
}
