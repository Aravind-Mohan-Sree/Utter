import {
  FileInput,
  IValidateDataService,
} from '~service-interfaces/IValidateDataService';
import { BadRequestError } from '~errors/HttpError';
import { FinishRegisterUserDTO } from './FinishRegisterUserDTO';

export class FinishRegisterTutorDTO extends FinishRegisterUserDTO {
  yearsOfExperience: string;
  introVideo: FileInput;
  certificate: FileInput;

  constructor(
    data: {
      email: string;
      languages: string[];
      experience: string;
      introVideo: FileInput;
      certificate: FileInput;
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
