import { TutorMapper, TutorResponseDTO } from '~mappers/TutorMapper';
import { ITutorRepository } from '~repository-interfaces/ITutorRepository';
import { IFetchTutorsUseCase } from '~use-case-interfaces/user/ITutorsUseCase';

/**
 * Use case to fetch tutors for the public listing page.
 * Only returns verified (Approved) tutors and filters out sensitive data.
 */
export class FetchTutorsUseCase implements IFetchTutorsUseCase {
  constructor(private _tutorRepo: ITutorRepository) { }

  /**
   * Retrieves a paginated list of verified tutors based on user search and filters.
   * @param data Object containing page, limit, search query, sort order, and language filter.
   * @returns Counts and mapped tutor response DTOs.
   */
  async execute(data: {
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
    }> {

    // Fetch tutors from repository with 'Approved' filter and non-admin mapping
    const { totalTutorsCount, filteredTutorsCount, tutors } =
            await this._tutorRepo.fetchTutors(
              data.page,
              data.limit,
              data.query,
              'Approved', // Strict requirement for public listing
              data.sort,
              data.language,
              false, // isAdmin = false, to exclude sensitive details
              data.minRating,
            );

    // Map entities to safe response DTOs
    const fetchedTutors = tutors.map(TutorMapper.toResponse);

    return { totalTutorsCount, filteredTutorsCount, tutors: fetchedTutors };
  }
}
