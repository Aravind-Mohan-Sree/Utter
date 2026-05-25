import { Tutor } from '~entities/Tutor';
import { ITutorRepository } from '~repository-interfaces/ITutorRepository';
import { IMailService } from '~service-interfaces/IMailService';
import { IRejectUseCase } from '~use-case-interfaces/admin/ITutorsUseCase';

/**
 * Use case to reject a tutor's verification request.
 * Sets a rejection reason and notifies the tutor.
 */
export class RejectUseCase implements IRejectUseCase {
  constructor(
    private _tutorRepo: ITutorRepository,
    private _mailService: IMailService,
  ) {}

  /**
   * Rejects a tutor's application and triggers a notification email.
   * @param id The tutor's ID.
   * @param rejectionReason The reason for rejection.
   * @returns The tutor's Google ID if they have one, used for further processing in controller.
   */
  async execute(
    id: string,
    rejectionReason: string,
  ): Promise<{ googleId: string | null; certificates: string[] } | null> {
    const tutor = await this._tutorRepo.findOneById(id);

    if (!tutor) return null;

    // Set the rejection reason and mark for expiration (cleanup)
    const partialTutor: Partial<Tutor> = {
      rejectionReason,
      expiresAt: new Date(),
    };

    // Clean up the reason string for the email (remove prefix if present)
    const cleanedReason = rejectionReason.includes('/')
      ? rejectionReason.split('/')[1]
      : rejectionReason;

    // Notify tutor and update the record
    await this._mailService.sendVerificationUpdate(tutor.name, tutor.email, cleanedReason);
    await this._tutorRepo.updateOneById(id, partialTutor);

    return {
      googleId: tutor.googleId,
      certificates: tutor.certificates || [],
    };
  }
}
