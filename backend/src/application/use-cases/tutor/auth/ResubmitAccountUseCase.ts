import { resubmitAccountDTO } from '~dtos/resubmitAccountDTO';
import { Tutor } from '~entities/Tutor';
import { ITutorRepository } from '~repository-interfaces/ITutorRepository';
import { IResubmitAccountUseCase } from '~use-case-interfaces/tutor/ITutorUseCase';

export class ResubmitAccountUseCase implements IResubmitAccountUseCase {
  constructor(private _tutorRepo: ITutorRepository) {}

  async execute(
    data: resubmitAccountDTO,
  ): Promise<{ oldId: string; newId: string; googleId: string; certificates: string[] }> {
    const { email } = data;
    let tutor = await this._tutorRepo.findOneByField({ email });
    const partialTutor: Partial<Tutor> = {
      rejectionReason: null,
      expiresAt: null,
    };

    tutor = await this._tutorRepo.updateOneByField({ email }, partialTutor);

    return {
      oldId: tutor?.id as string,
      newId: tutor?.id as string,
      googleId: tutor?.googleId as string,
      certificates: tutor?.certificates || [],
    };
  }
}
