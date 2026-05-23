import { Tutor } from '~entities/Tutor';

export class TutorMapper {
  static toResponse(tutor: Tutor) {
    return {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      knownLanguages: tutor.knownLanguages,
      yearsOfExperience: tutor.yearsOfExperience,
      bio: tutor.bio,
      role: tutor.role,
      isBlocked: tutor.isBlocked,
      isVerified: tutor.isVerified,
      certificationType: tutor.certificationType,
      rejectionReason: tutor.rejectionReason,
      pendingLanguages: tutor.pendingLanguages,
      pendingCertification: tutor.pendingCertification,
      languageVerificationStatus: tutor.languageVerificationStatus,
      certificates: tutor.certificates,
      createdAt: tutor.createdAt,
      averageRating: tutor.averageRating,
    };
  }
}

export type TutorResponseDTO = ReturnType<typeof TutorMapper.toResponse>;
