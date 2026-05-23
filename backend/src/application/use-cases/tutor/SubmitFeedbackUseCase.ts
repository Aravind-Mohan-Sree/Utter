import { ISubmitFeedbackUseCase } from '~use-case-interfaces/tutor/ISubmitFeedbackUseCase';
import { IBookingRepository } from '~repository-interfaces/IBookingRepository';
import { IFeedbackRepository } from '~repository-interfaces/IFeedbackRepository';
import { ISessionRepository } from '~repository-interfaces/ISessionRepository';
import { SubmitFeedbackDTO } from '~dtos/SubmitFeedbackDTO';
import { Feedback } from '~entities/Feedback';
import { FeedbackMapper, FeedbackResponseDTO } from '~mappers/FeedbackMapper';
import { NotFoundError, ForbiddenError, BadRequestError } from '~errors/HttpError';
import { FilterQuery } from '~repository-interfaces/IBaseRepository';
import { IFeedback } from '~models/FeedbackModel';

/**
 * Use case to submit a tutor's feedback on a student's session.
 * Verifies booking ownership, checks session completion or active minutes threshold,
 * ensures feedback hasn't already been submitted, and saves the new record.
 */
export class SubmitFeedbackUseCase implements ISubmitFeedbackUseCase {
  constructor(
    private _feedbackRepository: IFeedbackRepository,
    private _bookingRepository: IBookingRepository,
    private _sessionRepository: ISessionRepository,
  ) {}

  async execute(
    tutorId: string,
    dto: SubmitFeedbackDTO,
  ): Promise<FeedbackResponseDTO> {
    // 1. Fetch the target booking
    const booking = await this._bookingRepository.findOneById(dto.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // 2. Authorization check: ensure the tutor is indeed the one booked for this session
    if (booking.tutorId !== tutorId) {
      throw new ForbiddenError('You are not authorized to submit feedback for this session');
    }

    // 3. Prevent duplicate submissions: check if feedback already exists
    const existing = await this._feedbackRepository.findOneByField({
      bookingId: booking.id,
    } as unknown as FilterQuery<IFeedback>);

    if (existing) {
      throw new BadRequestError('Feedback has already been submitted for this session');
    }

    // 4. Retrieve the session to verify scheduled time
    const session = await this._sessionRepository.findOneById(booking.sessionId);
    if (!session) {
      throw new NotFoundError('Associated session not found');
    }

    const scheduledTime = new Date(session.scheduledAt);
    const now = new Date();

    // 5. Enforce feedback eligibility: must be a Completed session, or an Incomplete/Confirmed past session with > 15 mins active duration
    const isCompleted = booking.status === 'Completed';
    const isIncompleteWithTime = booking.status === 'Incomplete' && (booking.activeSeconds || 0) >= 900;
    const isPastConfirmedWithTime = booking.status === 'confirmed' && now > scheduledTime && (booking.activeSeconds || 0) >= 900;

    if (!isCompleted && !isIncompleteWithTime && !isPastConfirmedWithTime) {
      throw new BadRequestError('This session is not eligible for feedback. It must be completed or have at least 15 minutes of active call duration.');
    }

    // 6. Construct and persist the new Feedback domain entity
    const feedback = new Feedback(
      undefined,
      booking.id!,
      booking.userId,
      booking.tutorId,
      booking.language,
      booking.topic,
      dto.rating,
      dto.grammar,
      dto.vocabulary,
      dto.pronunciation,
      dto.speaking,
      dto.notes,
      new Date(),
      new Date(),
    );

    const savedFeedback = await this._feedbackRepository.create(feedback);

    // 7. Map to DTO and return
    return FeedbackMapper.toResponse(savedFeedback);
  }
}
