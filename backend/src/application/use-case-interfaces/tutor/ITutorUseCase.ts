import { ChangePasswordDTO } from '~dtos/ChangePasswordDTO';
import { FinishRegisterTutorDTO } from '~dtos/FinishRegisterTutorDTO';
import { RegisterTutorDTO } from '~dtos/RegisterTutorDTO';
import { resubmitAccountDTO } from '~dtos/resubmitAccountDTO';
import { SigninDTO } from '~dtos/SigninDTO';
import { TutorProfileUpdateDTO } from '~dtos/TutorProfileUpdateDTO';
import { TutorResponseDTO } from '~mappers/TutorMapper';

export interface IRegisterTutorUseCase {
  execute(data: RegisterTutorDTO): Promise<{ id: string; email: string }>;
}

export interface IFinishRegisterTutorUseCase {
  execute(
    data: FinishRegisterTutorDTO,
  ): Promise<{ oldId: string; newId: string }>;
}

export interface IResubmitAccountUseCase {
  execute(
    data: resubmitAccountDTO,
  ): Promise<{ oldId: string; newId: string; googleId: string; certificates: string[] }>;
}

export interface IRegisterTutorFromPendingUseCase {
  execute(email: string): Promise<{
    pendingTutorId: string;
    newTutorId: string;
    tutor: TutorResponseDTO;
  }>;
}

export interface ITutorGoogleRegisterUseCase {
  execute(name: string, email: string, googleId: string): Promise<string>;
}

export interface ITutorGoogleSigninUseCase {
  execute(
    email: string,
    googleId: string,
  ): Promise<{
    tutor: TutorResponseDTO;
    accessToken: string;
    refreshToken: string;
  }>;
}

export interface ISigninTutorUseCase {
  execute(data: SigninDTO): Promise<{
    tutor: TutorResponseDTO;
    accessToken: string;
    refreshToken: string;
  }>;
}

export interface IGetDataUseCase {
  execute(email: string): Promise<TutorResponseDTO | null>;
}

export interface IUpdateProfileUseCase {
  execute(id: string, data: TutorProfileUpdateDTO): Promise<TutorResponseDTO>;
}

export interface IChangePasswordUseCase {
  execute(id: string, data: ChangePasswordDTO): Promise<void>;
}
