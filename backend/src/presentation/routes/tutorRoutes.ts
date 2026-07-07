import express from 'express';
import passport from 'passport';
import { DataValidatorService } from '~concrete-services/DataValidatorService';
import { HashService } from '~concrete-services/HashService';
import { JwtService } from '~concrete-services/JwtService';
import { env } from '~config/env';
import { AuthController } from '~controllers/tutor/AuthController';
import { ForgotPasswordController } from '~controllers/shared/ForgotPasswordController';
import { TutorGoogleAuthController } from '~controllers/tutor/TutorGoogleAuthController';
import { OtpController } from '~controllers/tutor/OtpController';
import { SignoutController } from '~controllers/shared/SignoutController';
import { Tutor } from '~entities/Tutor';
import { PendingTutorRepository } from '~concrete-repositories/PendingTutorRepository';
import { TutorRepository } from '~concrete-repositories/TutorRepository';
import { UserRepository } from '~concrete-repositories/UserRepository';
import { Authenticate } from '~middlewares/Authenticate';
import { AuthMiddlewareBundler } from '~middlewares/AuthMiddlewareBundler';
import { Authorize } from '~middlewares/Authorize';
import { ITutor } from '~models/TutorModel';
import { GetEntityDataUseCase } from '~use-cases/shared/GetEntityDataUseCase';
import { RegisterTutorFromPendingUseCase } from '~use-cases/tutor/auth/RegisterTutorFromPendingUseCase';
import { RegisterTutorUseCase } from '~use-cases/tutor/auth/RegisterTutorUseCase';
import { SigninTutorUseCase } from '~use-cases/tutor/auth/SigninTutorUseCase';
import { TutorGoogleSigninUseCase } from '~use-cases/tutor/auth/TutorGoogleSigninUseCase';
import { ForgotPasswordOtpVerifyUseCase } from '~use-cases/tutor/tutor-management/ForgotPasswordOtpVerifyUseCase';
import { ForgotPasswordUseCase } from '~use-cases/tutor/tutor-management/ForgotPasswordUseCase';
import { ResetPasswordUseCase } from '~use-cases/tutor/tutor-management/ResetPasswordUseCase';
import { SendOtpUseCase } from '~use-cases/tutor/tutor-management/SendOtpUseCase';
import { VerifyOtpUseCase } from '~use-cases/tutor/tutor-management/VerifyOtpUseCase';
import { uploadMiddleware } from '~middlewares/multer';
import { VideoMetadataService } from '~concrete-services/VideoMetadataService';
import { S3Service } from '~concrete-services/S3Service';
import { GetDataController } from '~controllers/tutor/GetDataController';
import { GetDataUseCase } from '~use-cases/tutor/tutor-management/GetDataUseCase';
import { AvatarController } from '~controllers/shared/AvatarController';
import { ProfileController } from '~controllers/tutor/ProfileController';
import { UpdateProfileUseCase } from '~use-cases/tutor/tutor-management/UpdateProfileUseCase';
import { ChangePasswordUseCase } from '~use-cases/tutor/tutor-management/ChangePasswordUseCase';
import { AxiosImageGatewayService } from '~concrete-services/AxiosImageGatewayService';
import { TutorGoogleRegisterUseCase } from '~use-cases/tutor/auth/TutorGoogleRegisterUseCase';
import { FinishRegisterTutorUseCase } from '~use-cases/tutor/auth/FinishRegisterTutorUseCase';
import { UploadFileUseCase } from '~use-cases/shared/UploadFileUseCase';
import { UpdateFileUseCase } from '~use-cases/shared/UpdateFileUseCase';
import { DeleteFileUseCase } from '~use-cases/shared/DeleteFileUseCase';
import { UploadAvatarUseCase } from '~use-cases/shared/UploadAvatarUseCase';
import { MailService } from '~concrete-services/MailService';
import { ResubmitAccountUseCase } from '~use-cases/tutor/auth/ResubmitAccountUseCase';
import { SessionRepository } from '~concrete-repositories/SessionRepository';
import { CreateSessionUseCase } from '~use-cases/tutor/session/CreateSessionUseCase';
import { GetSessionsUseCase } from '~use-cases/tutor/session/GetSessionsUseCase';
import { CancelSessionUseCase } from '~use-cases/tutor/session/CancelSessionUseCase';
import { SessionController } from '~controllers/tutor/SessionController';
import { BookingController } from '~controllers/user/BookingController';
import { CreateBookingOrderUseCase } from '~use-cases/user/booking/CreateBookingOrderUseCase';
import { VerifyPaymentAndBookUseCase } from '~use-cases/user/booking/VerifyPaymentAndBookUseCase';
import { BookWithWalletUseCase } from '~use-cases/user/booking/BookWithWalletUseCase';
import { GetBookingsUseCase } from '~use-cases/shared/GetBookingsUseCase';
import { CancelBookingUseCase } from '~use-cases/shared/CancelBookingUseCase';
import { RescheduleBookingUseCase } from '~use-cases/shared/RescheduleBookingUseCase';
import { BookingRepository } from '~concrete-repositories/BookingRepository';
import { WalletRepository } from '~concrete-repositories/WalletRepository';
import { RazorpayService } from '~concrete-services/RazorpayService';
import { GetWalletTransactionsUseCase } from '~use-cases/shared/GetWalletTransactionsUseCase';
import { WalletController } from '~controllers/shared/WalletController';
import { PingBookingUseCase } from '~use-cases/shared/PingBookingUseCase';
import { RedisService } from '~concrete-services/RedisService';
import { SocketManager } from '~concrete-services/SocketManager';
import { NotificationRepository } from '~concrete-repositories/NotificationRepository';
import { CreateNotificationUseCase } from '~use-cases/shared/notification/CreateNotificationUseCase';
import { getNotificationRouter } from './notificationRoutes';
import { AbuseReportRepository } from '~concrete-repositories/AbuseReportRepository';
import { CreateAbuseReportUseCase } from '~use-cases/shared/report/CreateAbuseReportUseCase';
import { GetUserAbuseReportsUseCase } from '~use-cases/shared/report/GetUserAbuseReportsUseCase';
import { AbuseReportController } from '~controllers/shared/AbuseReportController';
import { FeedbackRepository } from '~concrete-repositories/FeedbackRepository';
import { SubmitFeedbackUseCase } from '~use-cases/tutor/SubmitFeedbackUseCase';
import { GetFeedbackUseCase } from '~use-cases/shared/GetFeedbackUseCase';
import { GetUserFeedbackFeedUseCase } from '~use-cases/user/GetUserFeedbackFeedUseCase';
import { GetUserLanguageProgressUseCase } from '~use-cases/user/GetUserLanguageProgressUseCase';
import { FeedbackController } from '~controllers/shared/FeedbackController';

import { ReviewRepository } from '~concrete-repositories/ReviewRepository';
import { GetTutorDashboardUseCase } from '~use-cases/tutor/tutor-management/GetTutorDashboardUseCase';
import { GetReviewsUseCase } from '~use-cases/user/reviews/GetReviewsUseCase';
import { TutorDashboardController } from '~controllers/tutor/TutorDashboardController';

// repositories
const userRepository = new UserRepository();
const tutorRepository = new TutorRepository();
const pendingTutorRepository = new PendingTutorRepository();
const sessionRepository = new SessionRepository();
const bookingRepository = new BookingRepository();
const walletRepository = new WalletRepository();
const notificationRepository = new NotificationRepository();
const abuseReportRepository = new AbuseReportRepository();
const feedbackRepository = new FeedbackRepository();
const reviewRepository = new ReviewRepository();

// services
const mailService = new MailService();
const dataValidatorService = new DataValidatorService();
const hashService = new HashService();
const jwtService = new JwtService();
const videoMetadataService = new VideoMetadataService();
const s3Service = new S3Service({
  region: env.AWS_REGION,
  bucket: env.AWS_BUCKET,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
});
const axiosImageGatewayService = new AxiosImageGatewayService();
const razorpayService = new RazorpayService();
const redisService = new RedisService();

// use-cases
const uploadFileUseCase = new UploadFileUseCase(s3Service);
const updateFileUseCase = new UpdateFileUseCase(s3Service);
const deleteFileUseCase = new DeleteFileUseCase(s3Service);
const registerTutorUseCase = new RegisterTutorUseCase(
  tutorRepository,
  pendingTutorRepository,
  hashService,
);
const finishRegisterTutorUseCase = new FinishRegisterTutorUseCase(
  pendingTutorRepository,
  tutorRepository,
  updateFileUseCase,
  uploadFileUseCase,
);
const resubmitAccountUseCase = new ResubmitAccountUseCase(tutorRepository);
const sendOtpUseCase = new SendOtpUseCase(mailService, pendingTutorRepository, redisService);
const verifyOtpUseCase = new VerifyOtpUseCase(
  mailService,
  redisService,
);
const registerTutorFromPendingUseCase = new RegisterTutorFromPendingUseCase(
  pendingTutorRepository,
  tutorRepository,
  updateFileUseCase,
);
const forgotPasswordUseCase = new ForgotPasswordUseCase(
  tutorRepository,
  pendingTutorRepository,
  redisService,
);
const forgotPasswordOtpVerifyUseCase = new ForgotPasswordOtpVerifyUseCase(
  pendingTutorRepository,
  mailService,
  jwtService,
  redisService,
);
const resetPasswordUseCase = new ResetPasswordUseCase(
  jwtService,
  tutorRepository,
  hashService,
);
const tutorGoogleRegisterUseCase = new TutorGoogleRegisterUseCase(
  pendingTutorRepository,
);
const tutorGoogleSigninUseCase = new TutorGoogleSigninUseCase(
  tutorRepository,
  jwtService,
);
const signinTutorUseCase = new SigninTutorUseCase(
  tutorRepository,
  hashService,
  jwtService,
);
const getDataUseCase = new GetDataUseCase(tutorRepository);
const updateProfileUseCase = new UpdateProfileUseCase(tutorRepository, uploadFileUseCase, mailService);
const changePasswordUseCase = new ChangePasswordUseCase(
  tutorRepository,
  hashService,
);
const createAbuseReportUseCase = new CreateAbuseReportUseCase(
  abuseReportRepository,
  s3Service,
);
const getUserAbuseReportsUseCase = new GetUserAbuseReportsUseCase(
  abuseReportRepository,
  userRepository,
  tutorRepository,
);
const abuseReportController = new AbuseReportController(
  createAbuseReportUseCase,
  getUserAbuseReportsUseCase,
  dataValidatorService,
);
const uploadAvatarUseCase = new UploadAvatarUseCase(
  s3Service,
  axiosImageGatewayService,
);
const createSessionUseCase = new CreateSessionUseCase(sessionRepository);
const getSessionsUseCase = new GetSessionsUseCase(sessionRepository);
const cancelSessionUseCase = new CancelSessionUseCase(sessionRepository);

// shared use cases
const getTutorDataUseCase = new GetEntityDataUseCase<Tutor, ITutor>(
  tutorRepository,
);

// controllers
const socketManager = SocketManager.getInstance();
const createNotificationUseCase = new CreateNotificationUseCase(notificationRepository, socketManager);
const authController = new AuthController(
  registerTutorUseCase,
  finishRegisterTutorUseCase,
  resubmitAccountUseCase,
  signinTutorUseCase,
  dataValidatorService,
  sendOtpUseCase,
  videoMetadataService,
  uploadFileUseCase,
  updateFileUseCase,
);
const otpController = new OtpController(
  verifyOtpUseCase,
  sendOtpUseCase,
  registerTutorFromPendingUseCase,
);
const forgotPasswordController = new ForgotPasswordController(
  forgotPasswordUseCase,
  sendOtpUseCase,
  forgotPasswordOtpVerifyUseCase,
  dataValidatorService,
  resetPasswordUseCase,
);
const tutorGoogleAuthController = new TutorGoogleAuthController(
  getDataUseCase,
  tutorGoogleRegisterUseCase,
  tutorGoogleSigninUseCase,
  uploadAvatarUseCase,
);
const signoutController = new SignoutController();
const getDataController = new GetDataController(getDataUseCase);
const avatarController = new AvatarController(
  uploadFileUseCase,
  deleteFileUseCase,
  dataValidatorService,
);
const profileController = new ProfileController(
  updateProfileUseCase,
  changePasswordUseCase,
  dataValidatorService,
);
const sessionController = new SessionController(
  createSessionUseCase,
  getSessionsUseCase,
  cancelSessionUseCase,
);

const getWalletTransactionsUseCase = new GetWalletTransactionsUseCase(walletRepository);
const walletController = new WalletController(getWalletTransactionsUseCase);

const createBookingOrderUseCase = new CreateBookingOrderUseCase(razorpayService, sessionRepository, redisService);
const verifyPaymentAndBookUseCase = new VerifyPaymentAndBookUseCase(
  bookingRepository,
  sessionRepository,
  userRepository,
  tutorRepository,
  razorpayService,
  mailService,
  walletRepository,
  createNotificationUseCase,
  redisService,
);
const bookWithWalletUseCase = new BookWithWalletUseCase(
  bookingRepository,
  sessionRepository,
  userRepository,
  tutorRepository,
  mailService,
  walletRepository,
  createNotificationUseCase,
  redisService,
);
const getBookingsUseCase = new GetBookingsUseCase(bookingRepository, sessionRepository, walletRepository);
const cancelBookingUseCase = new CancelBookingUseCase(
  bookingRepository,
  sessionRepository,
  userRepository,
  tutorRepository,
  walletRepository,
  mailService,
  createNotificationUseCase,
);
const rescheduleBookingUseCase = new RescheduleBookingUseCase(
  bookingRepository,
  sessionRepository,
  userRepository,
  tutorRepository,
  walletRepository,
  mailService,
  createNotificationUseCase,
  redisService,
);
const pingBookingUseCase = new PingBookingUseCase(bookingRepository, sessionRepository, redisService, walletRepository);

const bookingController = new BookingController(
  createBookingOrderUseCase,
  verifyPaymentAndBookUseCase,
  bookWithWalletUseCase,
  getBookingsUseCase,
  cancelBookingUseCase,
  pingBookingUseCase,
  rescheduleBookingUseCase,
);

const submitFeedbackUseCase = new SubmitFeedbackUseCase(
  feedbackRepository,
  bookingRepository,
  sessionRepository,
);
const getFeedbackUseCase = new GetFeedbackUseCase(
  feedbackRepository,
  bookingRepository,
);
const getUserFeedbackFeedUseCase = new GetUserFeedbackFeedUseCase(feedbackRepository);
const getUserLanguageProgressUseCase = new GetUserLanguageProgressUseCase(feedbackRepository);

const feedbackController = new FeedbackController(
  submitFeedbackUseCase,
  getFeedbackUseCase,
  getUserFeedbackFeedUseCase,
  getUserLanguageProgressUseCase,
  dataValidatorService,
);

const getReviewsUseCase = new GetReviewsUseCase(reviewRepository);

const getTutorDashboardUseCase = new GetTutorDashboardUseCase(
  bookingRepository,
  reviewRepository,
);
const tutorDashboardController = new TutorDashboardController(
  getTutorDashboardUseCase,
  getReviewsUseCase,
);

// wire auth middlewares
const authenticate = new Authenticate<Tutor>(jwtService, getTutorDataUseCase);
const authorize = new Authorize();
const auth = new AuthMiddlewareBundler(authenticate, authorize, 'tutor');

const router = express.Router();

// google auth
router.get(
  '/auth/google',
  passport.authenticate('google-tutor', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  }),
);
router.get(
  '/auth/google/callback',
  passport.authenticate('google-tutor', {
    failureRedirect: '/signin',
    session: false,
  }),
  (req, res, next) => tutorGoogleAuthController.handleSuccess(req, res, next),
);

// auth
router.post('/signup', uploadMiddleware, authController.register);
router.post('/finish-signup', uploadMiddleware, authController.finishRegister);
router.patch(
  '/resubmit-account',
  uploadMiddleware,
  authController.resubmitAccount,
);
router.post('/signin', authController.signin);

// tutor management
router.post('/verify-otp', otpController.verify);
router.patch('/resend-otp', otpController.resend);
router.post('/verify-email', forgotPasswordController.registerForgotPassword);
router.post(
  '/forgot-password-otp-verify',
  forgotPasswordController.ForgotPasswordOtpVerify,
);
router.patch('/reset-password', forgotPasswordController.resetPassword);
router.post('/signout', auth.verify(), signoutController.signout);
router.get(
  '/get-account-details',
  auth.verify(),
  getDataController.getAccountDetails,
);
router.post(
  '/upload-avatar',
  auth.verify(),
  uploadMiddleware,
  avatarController.uploadAvatar,
);
router.delete('/delete-avatar', auth.verify(), avatarController.deleteAvatar);
router.patch(
  '/update-profile',
  auth.verify(),
  uploadMiddleware,
  profileController.updateProfile,
);
router.patch(
  '/change-password',
  auth.verify(),
  profileController.changePassword,
);

// create session
router.post('/create-session', auth.verify(), sessionController.createSession);
router.get('/get-sessions', auth.verify(), sessionController.getSessions);
router.delete('/cancel-session/:sessionId', auth.verify(), sessionController.cancelSession);

// dashboard
router.get('/dashboard', auth.verify(), tutorDashboardController.getDashboardData);
router.get('/reviews', auth.verify(), tutorDashboardController.getReviews);

// booking
router.get('/bookings', auth.verify(), bookingController.getBookings);
router.patch('/bookings/:id/cancel', auth.verify(), bookingController.cancelBooking);
router.patch('/bookings/:id/reschedule', auth.verify(), bookingController.rescheduleBooking);
router.post('/bookings/:id/ping', auth.verify(), bookingController.pingSession);

// feedback
router.post('/feedback', auth.verify(), feedbackController.submitFeedback);
router.get('/feedback/booking/:bookingId', auth.verify(), feedbackController.getFeedbackByBooking);

// wallet
router.get('/wallet', auth.verify(), walletController.getTransactions);

// abuse reports
router.post('/reports', auth.verify(), abuseReportController.createReport);
router.get('/reports', auth.verify(), abuseReportController.getMyReports);

// notifications
router.use('/notifications', getNotificationRouter(auth));

export const tutorRouter = router;
