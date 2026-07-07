import { NextFunction, Request, Response } from 'express';
import { IGetEntityDataUseCase } from '~use-case-interfaces/shared/IGetEntityDataUseCase';
import { errorMessage } from '~constants/errorMessage';
import { ITokenService, TokenPayload } from '~service-interfaces/ITokenService';
import { UnauthorizedError } from '~errors/HttpError';
import { logger } from '~logger/logger';
import { env } from '~config/env';

interface IEntityData {
  id: string;
  isBlocked: boolean;
  email: string;
}

export interface IAuthenticate {
  verify(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export class Authenticate<Entity> implements IAuthenticate {
  constructor(
    private _tokenService: ITokenService,
    private _getEntity: IGetEntityDataUseCase<Entity>,
  ) {}

  private _getCookieOptions() {
    const isProduction = env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      sameSite: isProduction ? ('none' as const) : ('strict' as const),
      secure: isProduction,
      domain: isProduction ? env.COOKIE_DOMAIN : undefined,
      path: '/',
    };
  }

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      let accessToken = req.cookies.accessToken;
      const refreshToken = req.cookies.refreshToken;
      const cookieOptions = this._getCookieOptions();

      if (!accessToken && !refreshToken) {
        throw new UnauthorizedError(errorMessage.SESSION_EXPIRED);
      }

      let payload: TokenPayload = {};

      if (accessToken) {
        try {
          payload = this._tokenService.verifyAuthToken(accessToken);
        } catch {
          if (!refreshToken) {
            res.clearCookie('accessToken', cookieOptions);
            throw new UnauthorizedError(errorMessage.SESSION_EXPIRED);
          }
          accessToken = null;
        }
      }

      if (!accessToken && refreshToken) {
        try {
          payload = this._tokenService.verifyRefreshToken(refreshToken);
        } catch {
          res.clearCookie('accessToken', cookieOptions);
          res.clearCookie('refreshToken', cookieOptions);
          throw new UnauthorizedError(errorMessage.SESSION_EXPIRED);
        }
        const newAccessToken = this._tokenService.generateAuthToken({
          id: payload.id,
          role: payload.role,
        });

        res.cookie('accessToken', newAccessToken, {
          ...cookieOptions,
          maxAge: parseInt(env.ACCESS_TOKEN_AGE),
        });
      }

      const user = (await this._getEntity.getOneById(
        payload.id!,
      )) as IEntityData;

      if (!user || user.isBlocked) {
        res.clearCookie('accessToken', cookieOptions);
        res.clearCookie('refreshToken', cookieOptions);

        throw new UnauthorizedError(
          !user ? errorMessage.UNAUTHORIZED : errorMessage.BLOCKED,
        );
      }

      req.user = {
        id: user.id,
        role: payload.role as string,
        email: user.email,
      };

      return next();
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
