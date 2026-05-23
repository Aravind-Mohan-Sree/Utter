import z from 'zod';

const FileListSafe =
  typeof FileList !== 'undefined' ? FileList : class FileList {};
const FileSafe = typeof File !== 'undefined' ? File : class File {};

export const FileSchema = z
  .union([z.instanceof(FileListSafe), z.instanceof(FileSafe)])
  .refine((file) => {
    const fileObj =
      file instanceof FileListSafe ? (file as unknown as Array<File>)[0] : file;
    const standardFileObj = fileObj as File;

    if (fileObj) return standardFileObj.size <= 5000000; // 5MB(5000000) max

    return true;
  }, 'File too large (max 5MB)');

export const passwordSchema = z
  .string()
  .trim()
  .nonempty('Password is required')
  .min(8, 'Password minimum length is 8')
  .max(30, 'Password maximum length is 30')
  .regex(/^\S*$/, "Password can't include space")
  .regex(/\d/, 'Password must include a number')
  .regex(/[^\w\s]/, 'Password must include a special character')
  .regex(/(?=.*[A-Z])/, 'Password must include an uppercase character')
  .regex(/(?=.*[a-z])/, 'Password must include a lowercase character');

export const BaseSchema = z.object({
  name: z
    .string()
    .trim()
    .nonempty('Name is required')
    .regex(/^((?!\s{2,}).)*$/, "Name can't include consecutive space")
    .regex(/^\D*$/, "Name can't include numbers")
    .regex(/^[a-zA-Z0-9 ]*$/, "Name can't include special characters")
    .transform((val) => val.replace(/\s+/g, ''))
    .refine((val) => val.length >= 3, {
      message: 'Name minimum length is 3',
    })
    .refine((val) => val.length <= 16, {
      message: 'Name maximum length is 16',
    }),

  email: z
    .string()
    .trim()
    .nonempty('Email is required')
    .regex(/^\S*$/, "Email can't include space")
    .regex(
      /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'Invalid email format',
    ),

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

  languages: z
    .array(z.string().trim().nonempty("Language can't be empty"))
    .min(1, 'Language is required')
    .max(3, 'Maximum three languages allowed'),

  experience: z
    .string()
    .min(1, 'Experience is required')
    .refine((val) => val !== '', {
      message: 'Experience is required',
    }),

  introVideo: z.nullable(FileSchema).or(z.undefined()),

  certificate: z.nullable(FileSchema).or(z.undefined()),

  currentPassword: passwordSchema,

  password: passwordSchema,

  confirmPassword: z.string().trim().nonempty('Confirm password is required'),
});
