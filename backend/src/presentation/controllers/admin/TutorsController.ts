import { NextFunction, Request, Response } from 'express';
import { httpStatusCode } from '~constants/httpStatusCode';
import { successMessage } from '~constants/successMessage';
import { ApproveTutorDTO } from '~dtos/ApproveTutorDTO';
import { FetchAdminUsersDTO } from '~dtos/FetchAdminUsersDTO';
import { RejectTutorDTO } from '~dtos/RejectTutorDTO';
import { logger } from '~logger/logger';
import {
  IApproveUseCase,
  IFetchTutorsUseCase,
  IHandleLanguageVerificationUseCase,
  IRejectUseCase,
  IToggleStatusUseCase,
} from '~use-case-interfaces/admin/ITutorsUseCase';
import {
  IDeleteFileUseCase,
  IUpdateFileUseCase,
} from '~use-case-interfaces/shared/IFileUseCase';
import { contentTypes, filePrefixes } from '~constants/fileConstants';

interface TutorQuery {
  page: string;
  limit: string;
  query: string;
  filter: string;
}

/**
 * Controller for managing tutors from the admin perspective.
 * Handles tutor listings, status toggling, and verification (approval/rejection).
 */
export class TutorsController {
  constructor(
    private _fetchTutorsUC: IFetchTutorsUseCase,
    private _toggleStatusUC: IToggleStatusUseCase,
    private _approveUC: IApproveUseCase,
    private _rejectUC: IRejectUseCase,
    private _handleLanguageVerificationUC: IHandleLanguageVerificationUseCase,
    private _updateFileUC: IUpdateFileUseCase,
    private _deleteFileUC: IDeleteFileUseCase,
  ) {}

  /**
   * Fetches a paginated list of tutors based on filters and search queries.
   */
  fetchTutors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, query, filter } = new FetchAdminUsersDTO(
        req.query as unknown as TutorQuery,
      );
      const tutorsData = await this._fetchTutorsUC.execute({
        page,
        limit,
        query,
        filter,
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
   * Toggles the block/active status of a tutor.
   */
  toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this._toggleStatusUC.execute(id);

      res.status(httpStatusCode.OK).json({
        message: successMessage.STATUS_UPDATED,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Approves a tutor's account and sets their initial certification type.
   */
  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, certificationType } = new ApproveTutorDTO({
        id: req.params.id as string,
        certificationType: req.query.certificationType as string,
      });

      await this._approveUC.execute(id, certificationType);

      res.status(httpStatusCode.OK).json({
        message: successMessage.VERIFIED,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Rejects a tutor's account with a specific reason.
   * Handles file movements (e.g., moving documents to 'rejected' folders) based on the reason.
   */
  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, rejectionReason } = new RejectTutorDTO({
        id: req.params.id as string,
        rejectionReason: req.query.rejectionReason as string,
      });
      const dueToVideo = rejectionReason.split('/')[0] === 'video';

      const result = await this._rejectUC.execute(id, rejectionReason);

      if (result) {
        const { googleId, certificates } = result;

        // If tutor registered with Google, handle their avatar
        if (googleId) {
          await this._updateFileUC.execute(
            filePrefixes.TUTOR_AVATAR,
            filePrefixes.TEMP_REJECTED_TUTOR_AVATAR,
            id,
            id,
            contentTypes.IMAGE_JPEG,
          );
        }

        // Dynamically parse the actual S3 filename for the certificate
        const certUrl = certificates && certificates.length > 0
          ? certificates[certificates.length - 1]
          : null;
        const certFilename = (certUrl
          ? certUrl.split('/').pop()?.split('.')[0]
          : `${id}_1`) || `${id}_1`;

        // Move the valid file (video or certificate) to a temporary rejected location
        await this._updateFileUC.execute(
          dueToVideo ? filePrefixes.TUTOR_CERTIFICATE : filePrefixes.TUTOR_VIDEO,
          dueToVideo
            ? filePrefixes.TEMP_REJECTED_TUTOR_CERTIFICATE
            : filePrefixes.TEMP_REJECTED_TUTOR_VIDEO,
          dueToVideo ? certFilename : id,
          dueToVideo ? certFilename : id,
          dueToVideo ? contentTypes.APPLICATION_PDF : contentTypes.VIDEO_MP4,
        );
        
        // Delete the invalid file (the one that was the cause of rejection)
        await this._deleteFileUC.execute(
          dueToVideo ? filePrefixes.TUTOR_VIDEO : filePrefixes.TUTOR_CERTIFICATE,
          dueToVideo ? id : certFilename,
          dueToVideo ? contentTypes.VIDEO_MP4 : contentTypes.APPLICATION_PDF,
        );
      }

      res.status(httpStatusCode.OK).json({
        message: successMessage.VERIFIED,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Handles verification of newly added languages for an existing tutor.
   */
  handleLanguageVerification = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { id } = req.params;
      const { action, certificationType, rejectionReason } = req.query as {
        action: 'approve' | 'reject';
        certificationType?: string;
        rejectionReason?: string;
      };

      await this._handleLanguageVerificationUC.execute(id, action, {
        certificationType,
        rejectionReason,
      });

      res.status(httpStatusCode.OK).json({
        message: `Language verification ${action}d successfully.`,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
