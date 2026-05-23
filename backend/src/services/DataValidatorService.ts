import {
  FileInput,
  IValidateDataService,
  ValidatedData,
} from '~service-interfaces/IValidateDataService';
import * as z from 'zod';

import { errorMessage } from '~constants/errorMessage';

/**
 * Helper to convert Zod parse results into a standardized ValidatedData format.
 */
const toValidatedData = (data: z.ZodSafeParseResult<object>) => {
  return {
    success: data.success,
    message: data.error?.issues[0]?.message || 'Validation failed',
  };
};

/**
 * Schema for intro video file validation.
 * Constraints: Required, max 5MB, must be MP4.
 */
const IntroVideoSchema = z.any().superRefine((file, ctx) => {
  if (!file || typeof file !== 'object') {
    ctx.addIssue({
      code: 'custom',
      message: 'Intro video is required',
    });
    return;
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Intro video is required',
    });
    return;
  }

  if (file.size > 5_000_000) {
    ctx.addIssue({
      code: 'custom',
      message: 'Intro video too large (max 5MB)',
    });
  }

  if (file.mimetype !== 'video/mp4') {
    ctx.addIssue({
      code: 'custom',
      message: 'Intro video must be an MP4 file',
    });
  }
});

/**
 * Schema for certificate file validation.
 * Constraints: Required, max 5MB, must be PDF.
 */
const CertificateSchema = z.any().superRefine((file, ctx) => {
  if (!file || typeof file !== 'object') {
    ctx.addIssue({
      code: 'custom',
      message: 'Certificate is required',
    });
    return;
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Certificate is required',
    });
    return;
  }

  if (file.size > 5_000_000) {
    ctx.addIssue({
      code: 'custom',
      message: 'Certificate too large (max 5MB)',
    });
  }

  if (file.mimetype !== 'application/pdf') {
    ctx.addIssue({
      code: 'custom',
      message: 'Certificate must be a PDF file',
    });
  }
});

/**
 * Schema for profile avatar image validation.
 * Constraints: Required, max 2MB, must be JPEG/PNG/WebP.
 */
const AvatarSchema = z.any().superRefine((file, ctx) => {
  if (!file || typeof file !== 'object') {
    ctx.addIssue({
      code: 'custom',
      message: 'Avatar is required',
    });
    return;
  }

  if (typeof file.size !== 'number' || file.size <= 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Avatar is required',
    });
    return;
  }

  if (file.size > 2_000_000) {
    ctx.addIssue({
      code: 'custom',
      message: 'Avatar too large (max 2MB)',
    });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    ctx.addIssue({
      code: 'custom',
      message: 'Avatar must be a JPEG, PNG, or WebP image',
    });
  }
});

/**
 * Concrete service for data validation using Zod.
 * Provides granular validation for user profiles, authentication, and content uploads.
 */
export class DataValidatorService implements IValidateDataService {
  /**
   * Validates display names.
   * Rules: 3-16 chars, no consecutive spaces, no numbers, no special characters.
   */
  validateName(name: string): ValidatedData {
    const nameSchema = z.object({
      name: z
        .string()
        .trim()
        .nonempty('Name is required.')
        .regex(/^((?!\s{2,}).)*$/, "Name can't include consecutive space")
        .regex(/^\D*$/, "Name can't include numbers")
        .regex(/^[a-zA-Z0-9 ]*$/, "Name can't include special characters")
        .transform((val) => val.replace(/\s+/g, ''))
        .refine((val) => val.length >= 3, {
          message: 'Name minimum length is 3.',
        })
        .refine((val) => val.length <= 16, {
          message: 'Name maximum length is 16.',
        }),
    });

    return toValidatedData(nameSchema.safeParse({ name }));
  }

  /**
   * Validates user bio/descriptions.
   * Rules: 12-500 chars.
   */
  validateBio(bio: string): ValidatedData {
    const bioSchema = z.object({
      bio: z
        .string()
        .trim()
        .nonempty('Bio is required')
        .regex(/^((?!\s{2,}).)*$/, "Bio can't include consecutive space")
        .transform((val) => val.replace(/\s+/g, ''))
        .refine((val) => val.length >= 12, {
          message: 'Bio minimum length is 12',
        })
        .refine((val) => val.length <= 500, {
          message: 'Bio maximum length is 500',
        }),
    });

    return toValidatedData(bioSchema.safeParse({ bio }));
  }

  /**
   * Validates email addresses using a strict regex.
   */
  validateEmail(email: string): ValidatedData {
    const emailSchema = z.object({
      email: z
        .string()
        .trim()
        .nonempty('Email is required')
        .regex(/^\S*$/, "Email can't include space")
        .regex(
          /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
          'Invalid email format',
        ),
    });

    return toValidatedData(emailSchema.safeParse({ email }));
  }

  /**
   * Validates language lists.
   * Rules: 1-3 languages.
   */
  validateKnownLanguages(knownLanguages: string[]): ValidatedData {
    const languagesSchema = z.object({
      knownLanguages: z
        .array(z.string().trim().nonempty('Language cannot be empty'))
        .min(1, 'At least one language is required')
        .max(3, 'Maximum three languages allowed'),
    });

    return toValidatedData(languagesSchema.safeParse({ knownLanguages }));
  }

  /**
   * Validates experience range selection.
   */
  validateExperience(experience: string): ValidatedData {
    const experienceSchema = z.object({
      experience: z.enum(['0-1', '1-2', '2-3', '3-5', '5-10', '10+'], {
        message: 'Please select a valid experience range',
      }),
    });

    return toValidatedData(experienceSchema.safeParse({ experience }));
  }

  /**
   * Validates tutor intro video file metadata.
   */
  validateIntroVideo(introVideo: FileInput): ValidatedData {
    const introVideoSchema = z.object({
      introVideo: IntroVideoSchema,
    });

    return toValidatedData(introVideoSchema.safeParse({ introVideo }));
  }

  /**
   * Validates tutor certification file metadata (PDF).
   */
  validateCertificate(certificate: FileInput): ValidatedData {
    const certificateSchema = z.object({
      certificate: CertificateSchema,
    });

    return toValidatedData(certificateSchema.safeParse({ certificate }));
  }

  /**
   * Validates password strength.
   * Rules: 8-30 chars, no spaces, must include number, special char, uppercase, and lowercase.
   */
  validatePassword(password: string): ValidatedData {
    const passwordSchema = z.object({
      password: z
        .string()
        .trim()
        .nonempty('Password is required')
        .min(8, 'Password minimum length is 8')
        .max(30, 'Password maximum length is 30')
        .regex(/^\S*$/, "Password can't include space")
        .regex(/\d/, 'Password must include a number')
        .regex(/[^\w\s]/, 'Password must include a special character')
        .regex(/(?=.*[A-Z])/, 'Password must include an uppercase character')
        .regex(/(?=.*[a-z])/, 'Password must include a lowercase character'),
    });

    return toValidatedData(passwordSchema.safeParse({ password }));
  }

  /**
   * Validates 6-digit numeric OTPs.
   */
  validateOtp(otp: string): ValidatedData {
    const otpSchema = z.object({
      otp: z
        .string()
        .length(6, { message: 'OTP must be 6 digits long' })
        .regex(/^\d{6}$/, { message: 'OTP must contain only digits' }),
    });

    return toValidatedData(otpSchema.safeParse({ otp }));
  }

  /**
   * Validates avatar image file metadata.
   */
  validateAvatar(avatar: FileInput): ValidatedData {
    const avatarSchema = z.object({
      avatar: AvatarSchema,
    });

    return toValidatedData(avatarSchema.safeParse({ avatar }));
  }

  /**
   * Validates numeric ratings (1-5).
   */
  validateRating(rating: number): ValidatedData {
    const ratingSchema = z.object({
      rating: z
        .number()
        .min(1, errorMessage.RATING_MIN)
        .max(5, errorMessage.RATING_MAX),
    });

    return toValidatedData(ratingSchema.safeParse({ rating }));
  }

  /**
   * Validates review text content.
   */
  validateReviewNote(note: string): ValidatedData {
    const noteSchema = z.object({
      note: z
        .string()
        .trim()
        .min(5, errorMessage.NOTE_MIN)
        .max(500, errorMessage.NOTE_MAX),
    });

    return toValidatedData(noteSchema.safeParse({ note }));
  }

  /**
   * Validates chat message text length.
   */
  validateMessageText(text: string): ValidatedData {
    const chatSchema = z.object({
      text: z
        .string()
        .max(1000, errorMessage.MESSAGE_TEXT_MAX),
    });
    return toValidatedData(chatSchema.safeParse({ text }));
  }

  /**
   * Validates chat attachments with different size limits for video and other files.
   */
  validateAttachment(file: FileInput): ValidatedData {
    const attachmentSchema = z.any().superRefine((file, ctx) => {
      if (!file || typeof file !== 'object') {
        ctx.addIssue({ code: 'custom', message: 'Attachment is required' });
        return;
      }

      const isVideo = file.mimetype?.startsWith('video/');
      const limitMB = isVideo ? 50 : 10;
      const limitBytes = limitMB * 1024 * 1024;

      if (file.size > limitBytes) {
        ctx.addIssue({
          code: 'custom',
          message: `Attachment too large (max ${limitMB}MB for ${isVideo ? 'videos' : 'files'})`,
        });
      }
    });

    return toValidatedData(
      z.object({ file: attachmentSchema }).safeParse({ file }),
    );
  }
}
