import { NextFunction, Request, Response } from 'express';
import { RegisterTutorDTO } from '~dtos/RegisterTutorDTO';
import { SigninDTO } from '~dtos/SigninDTO';
import { ISendOtpUseCase } from '~use-case-interfaces/shared/IOtpUseCase';
import {
  IFinishRegisterTutorUseCase,
  IRegisterTutorUseCase,
  IResubmitAccountUseCase,
  ISigninTutorUseCase,
} from '~use-case-interfaces/tutor/ITutorUseCase';
import { env } from '~config/env';
import { httpStatusCode } from '~constants/httpStatusCode';
import { successMessage } from '~constants/successMessage';
import { IValidateDataService } from '~service-interfaces/IValidateDataService';
import { logger } from '~logger/logger';
import { UploadedFiles } from '~middlewares/multer';
import { IVideoMetadataService } from '~service-interfaces/IVideoMetadataService';
import { errorMessage } from '~constants/errorMessage';
import { BadRequestError } from '~errors/HttpError';
import { unlink } from 'fs/promises';
import { FinishRegisterTutorDTO } from '~dtos/FinishRegisterTutorDTO';
import {
  IUpdateFileUseCase,
  IUploadFileUseCase,
} from '~use-case-interfaces/shared/IFileUseCase';
import { resubmitAccountDTO } from '~dtos/resubmitAccountDTO';
import { contentTypes, filePrefixes } from '~constants/fileConstants';

/**
 * Controller for tutor authentication and registration flows.
 * Handles multi-step registration (including file uploads and OTP), account resubmission, and sign-in.
 */
export class AuthController {
  constructor(
    private _registerTutor: IRegisterTutorUseCase,
    private _finishRegisterTutor: IFinishRegisterTutorUseCase,
    private _resubmitAccountUseCase: IResubmitAccountUseCase,
    private _signinTutor: ISigninTutorUseCase,
    private _validator: IValidateDataService,
    private _sendOtp: ISendOtpUseCase,
    private _videoMetadataService: IVideoMetadataService,
    private _uploadFile: IUploadFileUseCase,
    private _updateFile: IUpdateFileUseCase,
  ) {}

  /**
   * Initiates the tutor registration process.
   * Validates video duration, saves temporary files, and sends OTP for email verification.
   */
  register = async (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as UploadedFiles;
    const introVideoFile = files.introVideo ? files.introVideo[0] : null;
    const certificateFile = files.certificate ? files.certificate[0] : null;

    try {
      const { introVideo: _, certificate: __, ...body } = req.body;
      const data = new RegisterTutorDTO(
        { introVideo: introVideoFile, certificate: certificateFile, ...body },
        this._validator,
      );

      // Check video duration (Limit: 30 seconds)
      const duration = await this._videoMetadataService.getDuration(
        introVideoFile!.path,
      );

      if (duration >= 31) {
        throw new BadRequestError(errorMessage.VIDEO);
      }

      // Execute base registration use case
      const { id, email } = await this._registerTutor.execute(data);

      // Upload files to temporary storage (S3)
      await this._uploadFile.execute(
        filePrefixes.TEMP_TUTOR_VIDEO,
        id,
        introVideoFile!.path,
        contentTypes.VIDEO_MP4,
      );
      await this._uploadFile.execute(
        filePrefixes.TEMP_TUTOR_CERTIFICATE,
        `${id}_1`,
        certificateFile!.path,
        contentTypes.APPLICATION_PDF,
      );

      // Trigger OTP verification
      await this._sendOtp.execute(email);

      const isProduction = env.NODE_ENV === 'production';
      const cookieOptions = {
        secure: isProduction,
        sameSite: isProduction ? 'none' : ('strict' as 'strict' | 'none'),
        maxAge: parseInt(env.OTP_AGE),
        domain: isProduction ? env.COOKIE_DOMAIN : undefined,
        path: '/',
      };

      res.cookie('otp', Date.now(), cookieOptions);

      res
        .status(httpStatusCode.CREATED)
        .json({ message: successMessage.OTP_SENDED });
    } catch (error) {
      // Cleanup local temporary files on failure
      if (introVideoFile?.path) {
        await unlink(introVideoFile.path);
      }

      if (certificateFile?.path) {
        await unlink(certificateFile.path);
      }

      logger.error(error);
      next(error);
    }
  };

  /**
   * Finalizes the tutor registration after email/OTP verification.
   * Moves files from temporary to permanent storage and creates the final tutor record.
   */
  finishRegister = async (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as UploadedFiles;
    const introVideoFile = files.introVideo ? files.introVideo[0] : null;
    const certificateFile = files.certificate ? files.certificate[0] : null;

    try {
      const { introVideo: _, certificate: __, ...body } = req.body;
      const data = new FinishRegisterTutorDTO(
        { introVideo: introVideoFile, certificate: certificateFile, ...body },
        this._validator,
      );

      // Re-validate video duration
      const duration = await this._videoMetadataService.getDuration(
        introVideoFile!.path,
      );

      if (duration >= 31) {
        throw new BadRequestError(errorMessage.VIDEO);
      }

      // Finalize record creation (handles file operations and DB updates)
      await this._finishRegisterTutor.execute(data);

      res
        .status(httpStatusCode.CREATED)
        .json({ message: successMessage.SIGNUP_SUCCESS });
    } catch (error) {
      if (introVideoFile?.path) {
        await unlink(introVideoFile.path);
      }

      if (certificateFile?.path) {
        await unlink(certificateFile.path);
      }

      logger.error(error);
      next(error);
    }
  };

  /**
   * Handles resubmission of a rejected tutor application.
   * Allows tutors to update their intro video or certificates and retry for approval.
   */
  resubmitAccount = async (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as UploadedFiles;
    const introVideoFile = files.introVideo ? files.introVideo[0] : null;
    const certificateFile = files.certificate ? files.certificate[0] : null;

    try {
      const { introVideo: _, certificate: __, ...body } = req.body;
      const data = new resubmitAccountDTO(
        { introVideo: introVideoFile, certificate: certificateFile, ...body },
        this._validator,
      );

      if (introVideoFile) {
        const duration = await this._videoMetadataService.getDuration(
          introVideoFile!.path,
        );

        if (duration >= 31) {
          throw new BadRequestError(errorMessage.VIDEO);
        }
      }

      // Process resubmission logic
      const { oldId, newId, googleId, certificates } =
        await this._resubmitAccountUseCase.execute(data);

      // If they registered via Google, move their temporary avatar
      if (googleId) {
        await this._updateFile.execute(
          filePrefixes.TEMP_REJECTED_TUTOR_AVATAR,
          filePrefixes.TUTOR_AVATAR,
          oldId,
          newId,
          contentTypes.IMAGE_JPEG,
        );
      }

      // Dynamically parse the actual S3 filename for the certificate
      const certUrl = certificates && certificates.length > 0
        ? certificates[certificates.length - 1]
        : null;
      const certFilename = (certUrl
        ? certUrl.split('/').pop()?.split('.')[0]
        : `${oldId}_1`) || `${oldId}_1`;

      // Transition existing or new files to permanent storage
      await this._updateFile.execute(
        introVideoFile
          ? filePrefixes.TEMP_REJECTED_TUTOR_CERTIFICATE
          : filePrefixes.TEMP_REJECTED_TUTOR_VIDEO,
        introVideoFile ? filePrefixes.TUTOR_CERTIFICATE : filePrefixes.TUTOR_VIDEO,
        introVideoFile ? certFilename : oldId,
        introVideoFile ? certFilename : newId,
        introVideoFile ? contentTypes.APPLICATION_PDF : contentTypes.VIDEO_MP4,
      );
      await this._uploadFile.execute(
        introVideoFile ? filePrefixes.TUTOR_VIDEO : filePrefixes.TUTOR_CERTIFICATE,
        introVideoFile ? oldId : certFilename,
        introVideoFile ? introVideoFile.path : certificateFile!.path,
        introVideoFile ? contentTypes.VIDEO_MP4 : contentTypes.APPLICATION_PDF,
      );

      res
        .status(httpStatusCode.OK)
        .json({ message: successMessage.ACCOUNT_RESUBMITTED });
    } catch (error) {
      if (introVideoFile?.path) {
        await unlink(introVideoFile.path);
      }

      if (certificateFile?.path) {
        await unlink(certificateFile.path);
      }

      logger.error(error);
      next(error);
    }
  };

  /**
   * Standard tutor sign-in.
   * Sets JWT cookies (Access & Refresh) upon successful authentication.
   */
  signin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = new SigninDTO(req.body, this._validator);
      const tutorData = await this._signinTutor.execute(data);
      const isProduction = env.NODE_ENV === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : ('strict' as 'strict' | 'none'),
        domain: isProduction ? env.COOKIE_DOMAIN : undefined,
        path: '/',
      };

      // Set cookies for secure session management
      res.cookie('accessToken', tutorData.accessToken, {
        ...cookieOptions,
        maxAge: parseInt(env.ACCESS_TOKEN_AGE),
      });
      res.cookie('refreshToken', tutorData.refreshToken, {
        ...cookieOptions,
        maxAge: parseInt(env.REFRESH_TOKEN_AGE),
      });
      res.status(httpStatusCode.OK).json({
        message: successMessage.SIGNIN_SUCCESS,
        tutor: tutorData.tutor,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
