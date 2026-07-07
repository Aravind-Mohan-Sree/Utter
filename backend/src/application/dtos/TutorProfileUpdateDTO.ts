import { BadRequestError } from '~errors/HttpError';
import {
  FileInput,
  IValidateDataService,
} from '~service-interfaces/IValidateDataService';
import { UserProfileUpdateDTO } from './UserProfileUpdateDTO';

export class TutorProfileUpdateDTO extends UserProfileUpdateDTO {
  yearsOfExperience: string;
  certificate: FileInput | null;

  constructor(
    data: {
      name: string;
      bio: string;
      languages: string[];
      experience: string;
      certificate?: FileInput | null;
    },
    validator: IValidateDataService,
  ) {
    super(data, validator);

    let result = validator.validateExperience(data.experience);

    if (!result.success) throw new BadRequestError(result.message);

    if (data.certificate) {
      result = validator.validateCertificate(data.certificate);
      if (!result.success) throw new BadRequestError(result.message);
    }

    this.yearsOfExperience = data.experience.trim();
    this.certificate = data.certificate || null;
  }
}
