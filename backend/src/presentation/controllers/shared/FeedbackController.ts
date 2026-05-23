import { NextFunction, Request, Response } from 'express';
import { ISubmitFeedbackUseCase } from '~use-case-interfaces/tutor/ISubmitFeedbackUseCase';
import { IGetFeedbackUseCase } from '~use-case-interfaces/shared/IGetFeedbackUseCase';
import { IGetUserFeedbackFeedUseCase } from '~use-case-interfaces/user/IGetUserFeedbackFeedUseCase';
import { IGetUserLanguageProgressUseCase } from '~use-case-interfaces/user/IGetUserLanguageProgressUseCase';
import { SubmitFeedbackDTO } from '~dtos/SubmitFeedbackDTO';
import { IValidateDataService } from '~service-interfaces/IValidateDataService';
import { logger } from '~logger/logger';

/**
 * Controller to handle tutor-to-student feedback endpoints.
 * Provides APIs to submit feedback, fetch feedback details for a specific session,
 * fetch infinite scroll streams of tutor feedbacks for a student, and fetch user language progress metrics.
 */
export class FeedbackController {
  constructor(
    private _submitFeedbackUseCase: ISubmitFeedbackUseCase,
    private _getFeedbackUseCase: IGetFeedbackUseCase,
    private _getUserFeedbackFeedUseCase: IGetUserFeedbackFeedUseCase,
    private _getUserLanguageProgressUseCase: IGetUserLanguageProgressUseCase,
    private _validator: IValidateDataService,
  ) {}

  /**
   * Post feedback for a booking (Tutor only).
   */
  submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dto = new SubmitFeedbackDTO(req.body, this._validator);
      const tutorId = req.user!.id;

      const feedback = await this._submitFeedbackUseCase.execute(tutorId, dto);

      return res.status(201).json({
        success: true,
        message: 'Feedback submitted successfully',
        feedback,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Get feedback details for a specific booking (Tutor or Student).
   */
  getFeedbackByBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user!.id;
      const role = req.user!.role;

      const feedback = await this._getFeedbackUseCase.execute(userId, role, bookingId);

      return res.status(200).json({
        success: true,
        feedback,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Get paginated infinite-scroll feedback feed for the student (Student only).
   */
  getUserFeedbackFeed = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const feed = await this._getUserFeedbackFeedUseCase.execute(userId, page, limit);

      return res.status(200).json({
        success: true,
        ...feed,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Get aggregated language progress stats for the student (Student only).
   */
  getUserLanguageProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const progress = await this._getUserLanguageProgressUseCase.execute(userId);

      return res.status(200).json({
        success: true,
        progress,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
