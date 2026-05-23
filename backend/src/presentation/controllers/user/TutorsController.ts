
import { NextFunction, Request, Response } from 'express';
import { httpStatusCode } from '~constants/httpStatusCode';
import { successMessage } from '~constants/successMessage';
import { logger } from '~logger/logger';
import { IFetchTutorsUseCase, IGetTutorSessionsUseCase } from '~use-case-interfaces/user/ITutorsUseCase';
import { FetchDataDTO } from '~dtos/FetchDataDTO';
import { IGetEntityDataUseCase } from '~use-case-interfaces/shared/IGetEntityDataUseCase';
import { Tutor } from '~entities/Tutor';
import { TutorMapper } from '~mappers/TutorMapper';

/**
 * Controller for users to browse and interact with tutors.
 * Provides endpoints for listing tutors, viewing details, and checking session availability.
 */
export class TutorsController {
  constructor(
        private _fetchTutorsUC: IFetchTutorsUseCase,
        private _getTutorDataUC: IGetEntityDataUseCase<Tutor>,
        private _getTutorSessionsUC: IGetTutorSessionsUseCase,
  ) { }

  /**
   * Fetches a paginated list of approved tutors with search and sorting.
   */
  fetchTutors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryData = new FetchDataDTO({
        page: req.query.page as string,
        limit: req.query.limit as string,
        query: req.query.query as string,
        sort: req.query.sort as string,
        language: req.query.language as string,
        minRating: req.query.minRating as string,
        filter: '',
      });

      const tutorsData = await this._fetchTutorsUC.execute({
        page: queryData.page,
        limit: queryData.limit,
        query: queryData.query,
        sort: queryData.sort,
        language: queryData.language,
        minRating: queryData.minRating,
      });

      res.status(httpStatusCode.OK).json({
        message: successMessage.DATA_FETCH_SUCCESS,
        tutorsData,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Retrieves public profile details for a specific tutor.
   */
  getTutorDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tutorId = req.params.id;
      const tutor = await this._getTutorDataUC.getOneById(tutorId);

      // Security check: Don't show details for non-existent or blocked tutors
      if (!tutor || tutor.isBlocked) {
        throw new Error('Tutor not found');
      }

      const tutorDTO = TutorMapper.toResponse(tutor);

      res.status(httpStatusCode.OK).json({
        message: successMessage.DATA_FETCH_SUCCESS,
        tutor: tutorDTO,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Fetches available sessions for a specific tutor, optionally filtered by date.
   */
  getTutorSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tutorId = req.params.id;
      const { date } = req.query;

      let startDate: Date | undefined;
      if (date) {
        startDate = new Date(date as string);
      }

      const sessions = await this._getTutorSessionsUC.execute(tutorId, startDate);

      res.status(httpStatusCode.OK).json({
        message: successMessage.DATA_FETCH_SUCCESS,
        sessions,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
