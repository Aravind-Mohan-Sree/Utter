import { NextFunction, Request, Response } from 'express';
import { errorMessage } from '~constants/errorMessage';
import { httpStatusCode } from '~constants/httpStatusCode';
import { successMessage } from '~constants/successMessage';
import { NotFoundError, BadRequestError } from '~errors/HttpError';
import { logger } from '~logger/logger';
import { IGetDataUseCase } from '~use-case-interfaces/tutor/ITutorUseCase';

export class GetDataController {
  constructor(private _getData: IGetDataUseCase) {}

  getAccountDetails = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const email = req.user?.email;
      if (!email) {
        throw new BadRequestError('Tutor email not found in token payload');
      }
      const tutor = await this._getData.execute(email);

      if (!tutor) throw new NotFoundError(errorMessage.SOMETHING_WRONG);

      res
        .status(httpStatusCode.OK)
        .json({ message: successMessage.DATA_FETCH_SUCCESS, tutor });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
