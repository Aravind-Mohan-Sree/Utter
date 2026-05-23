import { NextFunction, Request, Response } from 'express';
import { httpStatusCode } from '~constants/httpStatusCode';
import { logger } from '~logger/logger';
import { IGetTutorDashboardUseCase } from '~use-case-interfaces/tutor/IGetTutorDashboardUseCase';
import { IGetReviewsUseCase } from '~use-case-interfaces/user/IReviewUseCase';
import { TutorDashboardMapper } from '~mappers/TutorDashboardMapper';
import { ReviewMapper } from '~mappers/ReviewMapper';

interface IAuthenticatedRequest extends Request {
  user: {
    id: string;
    role: 'user' | 'tutor' | 'admin';
  };
}

export class TutorDashboardController {
  constructor(
    private _getTutorDashboardUseCase: IGetTutorDashboardUseCase,
    private _getReviewsUseCase: IGetReviewsUseCase,
  ) {}

  getDashboardData = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = (req as unknown as IAuthenticatedRequest).user;
      const tutorId = user.id;

      const data = await this._getTutorDashboardUseCase.execute(tutorId);
      const response = TutorDashboardMapper.toResponse(data);

      res.status(httpStatusCode.OK).json({
        success: true,
        ...response,
      });
    } catch (error) {
      logger.error('Tutor dashboard data fetch failed:', error);
      next(error);
    }
  };

  getReviews = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = (req as unknown as IAuthenticatedRequest).user;
      const tutorId = user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 5;

      const { reviews, totalCount, totalPages, currentPage } =
        await this._getReviewsUseCase.execute(tutorId, page, limit);

      res.status(httpStatusCode.OK).json({
        success: true,
        reviews: ReviewMapper.toResponseList(reviews),
        totalCount,
        totalPages,
        currentPage,
      });
    } catch (error) {
      logger.error('Tutor reviews fetch failed:', error);
      next(error);
    }
  };
}
