export class Tutor {
  constructor(
    public name: string,
    public email: string,
    public knownLanguages: string[],
    public yearsOfExperience: string,
    public bio: string,
    public password: string,
    public googleId: string | null,
    public role: string,
    public isBlocked: boolean,
    public isVerified: boolean,
    public certificationType: string[],
    public rejectionReason: string | null,
    public pendingLanguages: string[] = [],
    public pendingCertification: string | null = null,
    public languageVerificationStatus:
      | 'pending'
      | 'approved'
      | 'rejected'
      | null = null,
    public certificates: string[] = [],
    public id?: string,
    public expiresAt?: Date | null,
    public createdAt?: Date,
    public updatedAt?: Date,
    public averageRating?: number,
  ) {}
}
