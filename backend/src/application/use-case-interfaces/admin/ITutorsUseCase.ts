import { TutorResponseDTO } from '~mappers/TutorMapper';

export interface IFetchTutorsUseCase {
  execute(data: {
    page: number;
    limit: number;
    query: string;
    filter: string;
  }): Promise<{
    totalTutorsCount: number;
    filteredTutorsCount: number;
    tutors: TutorResponseDTO[];
  }>;
}

export interface IToggleStatusUseCase {
  execute(id: string): Promise<void>;
}

export interface IApproveUseCase {
  execute(id: string, certificationType: string): Promise<void>;
}

export interface IRejectUseCase {
  execute(
    id: string,
    rejectionReason: string,
  ): Promise<{ googleId: string | null; certificates: string[] } | null>;
}

export interface IHandleLanguageVerificationUseCase {
  execute(
    id: string,
    action: 'approve' | 'reject',
    data: { certificationType?: string; rejectionReason?: string },
  ): Promise<void>;
}
