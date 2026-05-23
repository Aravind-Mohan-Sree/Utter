import { TutorDashboardResponseDTO } from '~dtos/TutorDashboardDTO';

export interface IGetTutorDashboardUseCase {
  execute(tutorId: string): Promise<TutorDashboardResponseDTO>;
}
