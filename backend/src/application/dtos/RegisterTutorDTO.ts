import {
  FileInput,
  IValidateDataService,
} from '~service-interfaces/IValidateDataService';
import { BadRequestError } from '~errors/HttpError';
import { RegisterUserDTO } from './RegisterUserDTO';

export class RegisterTutorDTO extends RegisterUserDTO {
  yearsOfExperience: string;
  introVideo: FileInput;
  certificate: FileInput;

  constructor(
    data: {
      name: string;
      email: string;
      languages: string[];
      experience: string;
      introVideo: FileInput;
      certificate: FileInput;
      password: string;
      confirmPassword: string;
    },
    validator: IValidateDataService,
  ) {
    super(data, validator);

    let result = validator.validateExperience(data.experience);

    if (!result.success) throw new BadRequestError(result.message);

    result = validator.validateIntroVideo(data.introVideo);

    if (!result.success) throw new BadRequestError(result.message);

    result = validator.validateCertificate(data.certificate);

    if (!result.success) throw new BadRequestError(result.message);

    this.yearsOfExperience = data.experience.trim();
    this.introVideo = data.introVideo;
    this.certificate = data.certificate;
  }
}
