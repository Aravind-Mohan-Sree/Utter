import { TutorResponseDTO } from '~mappers/TutorMapper';
import { SessionResponseDTO } from '~mappers/SessionMapper';

export interface IFetchTutorsUseCase {
    execute(data: {
        page: number;
        limit: number;
        query: string;
        sort: string;
        language: string;
        minRating?: number;
    }): Promise<{
        totalTutorsCount: number;
        filteredTutorsCount: number;
        tutors: TutorResponseDTO[];
    }>;
}

export interface IGetTutorSessionsUseCase {
    execute(tutorId: string, startDate?: Date, endDate?: Date): Promise<SessionResponseDTO[]>;
}
