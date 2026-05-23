import express from 'express';
import passport from 'passport';
import { BookingController } from '~controllers/user/BookingController';
import { CreateBookingOrderUseCase } from '~use-cases/user/booking/CreateBookingOrderUseCase';
import { VerifyPaymentAndBookUseCase } from '~use-cases/user/booking/VerifyPaymentAndBookUseCase';
import { BookWithWalletUseCase } from '~use-cases/user/booking/BookWithWalletUseCase';
import { RazorpayService } from '~concrete-services/RazorpayService';
import { BookingRepository } from '~concrete-repositories/BookingRepository';
import { FetchTutorsUseCase } from '~use-cases/user/tutors/FetchTutorsUseCase';
import { GetTutorSessionsUseCase } from '~use-cases/user/tutors/GetTutorSessionsUseCase';
import { TutorsController } from '~controllers/user/TutorsController';
import { TutorRepository } from '~concrete-repositories/TutorRepository';
import { SessionRepository } from '~concrete-repositories/SessionRepository';
import { DataValidatorService } from '~concrete-services/DataValidatorService';
import { HashService } from '~concrete-services/HashService';
import { JwtService } from '~concrete-services/JwtService';
import { env } from '~config/env';
import { AuthController } from '~controllers/user/AuthController';
import { ForgotPasswordController } from '~controllers/shared/ForgotPasswordController';
import { UserGoogleAuthController } from '~controllers/user/UserGoogleAuthController';
import { OtpController } from '~controllers/user/OtpController';
import { SignoutController } from '~controllers/shared/SignoutController';
import { User } from '~entities/User';
import { PendingUserRepository } from '~concrete-repositories/PendingUserRepository';
import { UserRepository } from '~concrete-repositories/UserRepository';
import { Authenticate } from '~middlewares/Authenticate';
import { AuthMiddlewareBundler } from '~middlewares/AuthMiddlewareBundler';
import { Authorize } from '~middlewares/Authorize';
import { IUser } from '~models/UserModel';
import { Tutor } from '~entities/Tutor';
import { ITutor } from '~models/TutorModel';
import { GetEntityDataUseCase } from '~use-cases/shared/GetEntityDataUseCase';
import { RegisterUserFromPendingUseCase } from '~use-cases/user/auth/RegisterUserFromPendingUseCase';
import { RegisterUserUseCase } from '~use-cases/user/auth/RegisterUserUseCase';
import { SigninUserUseCase } from '~use-cases/user/auth/SigninUserUseCase';
import { UserGoogleSigninUseCase } from '~use-cases/user/auth/UserGoogleSigninUseCase';
import { ForgotPasswordOtpVerifyUseCase } from '~use-cases/user/user-management/ForgotPasswordOtpVerifyUseCase';
import { ForgotPasswordUseCase } from '~use-cases/user/user-management/ForgotPasswordUseCase';
import { ResetPasswordUseCase } from '~use-cases/user/user-management/ResetPasswordUseCase';
import { SendOtpUseCase } from '~use-cases/user/user-management/SendOtpUseCase';
import { VerifyOtpUseCase } from '~use-cases/user/user-management/VerifyOtpUseCase';
import { uploadMiddleware } from '~middlewares/multer';
import { GetDataController } from '~controllers/user/GetDataController';
import { GetDataUseCase } from '~use-cases/user/user-management/GetDataUseCase';
import { AvatarController } from '~controllers/shared/AvatarController';
import { S3Service } from '~concrete-services/S3Service';
import { UpdateProfileUseCase } from '~use-cases/user/user-management/UpdateProfileUseCase';
import { ChangePasswordUseCase } from '~use-cases/user/user-management/ChangePasswordUseCase';
import { ProfileController } from '~controllers/user/ProfileController';
import { AxiosImageGatewayService } from '~concrete-services/AxiosImageGatewayService';
import { UserGoogleRegisterUseCase } from '~use-cases/user/auth/UserGoogleRegisterUseCase';
import { UploadFileUseCase } from '~use-cases/shared/UploadFileUseCase';
import { DeleteFileUseCase } from '~use-cases/shared/DeleteFileUseCase';
import { UploadAvatarUseCase } from '~use-cases/shared/UploadAvatarUseCase';
import { FinishRegisterUserUseCase } from '~use-cases/user/auth/FinishRegisterUserUseCase';
import { UpdateFileUseCase } from '~use-cases/shared/UpdateFileUseCase';
import { UploadChatAttachmentUseCase } from '~use-cases/shared/UploadChatAttachmentUseCase';
import { MailService } from '~concrete-services/MailService';
import { GetBookingsUseCase } from '~use-cases/shared/GetBookingsUseCase';
import { CancelBookingUseCase } from '~use-cases/shared/CancelBookingUseCase';
import { GetWalletTransactionsUseCase } from '~use-cases/shared/GetWalletTransactionsUseCase';
import { WalletController } from '~controllers/shared/WalletController';
import { WalletRepository } from '~concrete-repositories/WalletRepository';
import { PingBookingUseCase } from '~use-cases/shared/PingBookingUseCase';
import { RedisService } from '~concrete-services/RedisService';
import { SocketManager } from '~concrete-services/SocketManager';
import { NotificationRepository } from '~concrete-repositories/NotificationRepository';
import { CreateNotificationUseCase } from '~use-cases/shared/notification/CreateNotificationUseCase';
import { getNotificationRouter } from './notificationRoutes';
import { ReviewRepository } from '~concrete-repositories/ReviewRepository';
import { AddReviewUseCase } from '~use-cases/user/reviews/AddReviewUseCase';
import { GetReviewsUseCase } from '~use-cases/user/reviews/GetReviewsUseCase';
import { UpdateReviewUseCase } from '~use-cases/user/reviews/UpdateReviewUseCase';
import { DeleteReviewUseCase } from '~use-cases/user/reviews/DeleteReviewUseCase';
import { GetReviewEligibilityUseCase } from '~use-cases/user/reviews/GetReviewEligibilityUseCase';
import { ReviewController } from '~controllers/user/ReviewController';
import { ConversationRepository } from '~concrete-repositories/ConversationRepository';
import { MessageRepository } from '~concrete-repositories/MessageRepository';
import { GetConversationsUseCase } from '~use-cases/user/chat/GetConversationsUseCase';
import { GetMessagesUseCase } from '~use-cases/user/chat/GetMessagesUseCase';
import { SendMessageUseCase } from '~use-cases/user/chat/SendMessageUseCase';
import { SearchChatUseCase } from '~use-cases/user/chat/SearchChatUseCase';
import { ChatController } from '~controllers/user/ChatController';
import { EditMessageUseCase } from '~use-cases/user/chat/EditMessageUseCase';
import { DeleteMessageUseCase } from '~use-cases/user/chat/DeleteMessageUseCase';
import { QuizRepository } from '~concrete-repositories/QuizRepository';
import { GeminiService } from '~concrete-services/GeminiService';
import { GenerateQuizUseCase } from '~use-cases/user/quiz/GenerateQuizUseCase';
import { CheckAnswerUseCase } from '~use-cases/user/quiz/CheckAnswerUseCase';
import { CompleteQuizUseCase } from '~use-cases/user/quiz/CompleteQuizUseCase';
import { GetQuizHistoryUseCase } from '~use-cases/user/quiz/GetQuizHistoryUseCase';
import { GetQuizLeaderboardUseCase } from '~use-cases/user/quiz/GetQuizLeaderboardUseCase';
import { QuizController } from '~controllers/user/QuizController';
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

// repositories
const userRepository = new UserRepository();
const pendingUserRepository = new PendingUserRepository();
const tutorRepository = new TutorRepository();
const sessionRepository = new SessionRepository();
const bookingRepository = new BookingRepository();
const walletRepository = new WalletRepository();
const reviewRepository = new ReviewRepository();
const conversationRepository = new ConversationRepository();
const messageRepository = new MessageRepository();
const quizRepository = new QuizRepository();
const notificationRepository = new NotificationRepository();
const abuseReportRepository = new AbuseReportRepository();
const feedbackRepository = new FeedbackRepository();

// services
const mailService = new MailService();
const dataValidatorService = new DataValidatorService();
const hashService = new HashService();
const jwtService = new JwtService();
const s3Service = new S3Service({
  region: env.AWS_REGION,
  bucket: env.AWS_BUCKET,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
});
const axiosImageGatewayService = new AxiosImageGatewayService();
const razorpayService = new RazorpayService();
const redisService = new RedisService();
const geminiService = new GeminiService();

// use cases
const socketManager = SocketManager.getInstance();
const createNotificationUseCase = new CreateNotificationUseCase(notificationRepository, socketManager);
const registerUserUseCase = new RegisterUserUseCase(
  userRepository,
  pendingUserRepository,
  hashService,
);
const finishRegisterUserUseCase = new FinishRegisterUserUseCase(
  pendingUserRepository,
  userRepository,
  jwtService,
  mailService,
);
const sendOtpUseCase = new SendOtpUseCase(mailService, pendingUserRepository, redisService);
const verifyOtpUseCase = new VerifyOtpUseCase(
  mailService,
  redisService,
);
const registerUserFromPendingUseCase = new RegisterUserFromPendingUseCase(
  pendingUserRepository,
  userRepository,
  mailService,
);
const forgotPasswordUseCase = new ForgotPasswordUseCase(
  userRepository,
  pendingUserRepository,
  redisService,
);
const forgotPasswordOtpVerifyUseCase = new ForgotPasswordOtpVerifyUseCase(
  pendingUserRepository,
  mailService,
  jwtService,
  redisService,
);
const resetPasswordUseCase = new ResetPasswordUseCase(
  jwtService,
  userRepository,
  hashService,
);
const userGoogleRegisterUseCase = new UserGoogleRegisterUseCase(
  pendingUserRepository,
);
const userGoogleSigninUseCase = new UserGoogleSigninUseCase(
  userRepository,
  jwtService,
);
const signinUserUseCase = new SigninUserUseCase(
  userRepository,
  hashService,
  jwtService,
);
const getDataUseCase = new GetDataUseCase(userRepository);
const uploadFileUseCase = new UploadFileUseCase(s3Service);
const updateFileUseCase = new UpdateFileUseCase(s3Service);
const deleteAvatarUseCase = new DeleteFileUseCase(s3Service);
const updateProfileUseCase = new UpdateProfileUseCase(userRepository);
const changePasswordUseCase = new ChangePasswordUseCase(
  userRepository,
  hashService,
);
const uploadAvatarUseCase = new UploadAvatarUseCase(
  s3Service,
  axiosImageGatewayService,
);
const uploadChatAttachmentUseCase = new UploadChatAttachmentUseCase(s3Service);

// shared use cases
const getUserDataUseCase = new GetEntityDataUseCase<User, IUser>(
  userRepository,
);

const fetchTutorsUseCase = new FetchTutorsUseCase(tutorRepository);
const getTutorDataUseCase = new GetEntityDataUseCase<Tutor, ITutor>(
  tutorRepository,
);
const getTutorSessionsUseCase = new GetTutorSessionsUseCase(sessionRepository);

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
const pingBookingUseCase = new PingBookingUseCase(bookingRepository, sessionRepository, redisService, walletRepository);

const addReviewUseCase = new AddReviewUseCase(reviewRepository);
const getReviewsUseCase = new GetReviewsUseCase(reviewRepository);
const updateReviewUseCase = new UpdateReviewUseCase(reviewRepository);
const deleteReviewUseCase = new DeleteReviewUseCase(reviewRepository);
const getReviewEligibilityUseCase = new GetReviewEligibilityUseCase(reviewRepository);

const getConversationsUseCase = new GetConversationsUseCase(conversationRepository);
const getMessagesUseCase = new GetMessagesUseCase(
  messageRepository,
  conversationRepository,
);
const sendMessageUseCase = new SendMessageUseCase(
  messageRepository,
  conversationRepository,
  userRepository,
  tutorRepository,
  createNotificationUseCase,
);
const searchChatUseCase = new SearchChatUseCase(messageRepository, userRepository);
const editMessageUseCase = new EditMessageUseCase(messageRepository);
const deleteMessageUseCase = new DeleteMessageUseCase(messageRepository, s3Service);

// quiz use cases
const generateQuizUseCase = new GenerateQuizUseCase(quizRepository, geminiService);
const checkAnswerUseCase = new CheckAnswerUseCase(quizRepository);
const completeQuizUseCase = new CompleteQuizUseCase(quizRepository, userRepository);
const getQuizHistoryUseCase = new GetQuizHistoryUseCase(quizRepository);
const getQuizLeaderboardUseCase = new GetQuizLeaderboardUseCase(quizRepository);

const createAbuseReportUseCase = new CreateAbuseReportUseCase(abuseReportRepository, s3Service);
const getUserAbuseReportsUseCase = new GetUserAbuseReportsUseCase(
  abuseReportRepository,
  userRepository,
  tutorRepository,
);

// controllers
const authController = new AuthController(
  registerUserUseCase,
  finishRegisterUserUseCase,
  signinUserUseCase,
  dataValidatorService,
  sendOtpUseCase,
  updateFileUseCase,
);
const otpController = new OtpController(
  verifyOtpUseCase,
  sendOtpUseCase,
  registerUserFromPendingUseCase,
);
const forgotPasswordController = new ForgotPasswordController(
  forgotPasswordUseCase,
  sendOtpUseCase,
  forgotPasswordOtpVerifyUseCase,
  dataValidatorService,
  resetPasswordUseCase,
);
const userGoogleAuthController = new UserGoogleAuthController(
  getDataUseCase,
  userGoogleRegisterUseCase,
  userGoogleSigninUseCase,
  uploadAvatarUseCase,
);
const signoutController = new SignoutController();
const tutorsController = new TutorsController(
  fetchTutorsUseCase,
  getTutorDataUseCase,
  getTutorSessionsUseCase,
);
const bookingController = new BookingController(
  createBookingOrderUseCase,
  verifyPaymentAndBookUseCase,
  bookWithWalletUseCase,
  getBookingsUseCase,
  cancelBookingUseCase,
  pingBookingUseCase,
);
const getDataController = new GetDataController(getDataUseCase);
const avatarController = new AvatarController(
  uploadFileUseCase,
  deleteAvatarUseCase,
  dataValidatorService,
);
const profileController = new ProfileController(
  updateProfileUseCase,
  changePasswordUseCase,
  dataValidatorService,
);

const getWalletTransactionsUseCase = new GetWalletTransactionsUseCase(walletRepository);
const walletController = new WalletController(getWalletTransactionsUseCase);

const reviewController = new ReviewController(
  addReviewUseCase,
  getReviewsUseCase,
  updateReviewUseCase,
  deleteReviewUseCase,
  getReviewEligibilityUseCase,
  dataValidatorService,
);

const chatController = new ChatController(
  getConversationsUseCase,
  getMessagesUseCase,
  sendMessageUseCase,
  searchChatUseCase,
  editMessageUseCase,
  deleteMessageUseCase,
  uploadChatAttachmentUseCase,
  dataValidatorService,
);

const quizController = new QuizController(
  generateQuizUseCase,
  checkAnswerUseCase,
  completeQuizUseCase,
  getQuizHistoryUseCase,
  getQuizLeaderboardUseCase,
);

const abuseReportController = new AbuseReportController(
  createAbuseReportUseCase,
  getUserAbuseReportsUseCase,
  dataValidatorService,
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

// wire auth middlewares
const authenticate = new Authenticate<User>(jwtService, getUserDataUseCase);
const authorize = new Authorize();
const auth = new AuthMiddlewareBundler(authenticate, authorize, 'user');

const router = express.Router();

// google auth
router.get(
  '/auth/google',
  passport.authenticate('google-user', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  }),
);
router.get(
  '/auth/google/callback',
  passport.authenticate('google-user', {
    failureRedirect: '/signin',
    session: false,
  }),
  (req, res, next) => userGoogleAuthController.handleSuccess(req, res, next),
);

// auth
router.post('/signup', uploadMiddleware, authController.register);
router.post('/finish-signup', uploadMiddleware, authController.finishRegister);
router.post('/signin', authController.signin);

// user management
router.post('/verify-otp', otpController.verify);
router.patch('/resend-otp', otpController.resend);
router.post('/verify-email', forgotPasswordController.registerForgotPassword);
router.post(
  '/forgot-password-otp-verify',
  forgotPasswordController.ForgotPasswordOtpVerify,
);
router.patch('/reset-password', forgotPasswordController.resetPassword);
router.post('/signout', signoutController.signout);
router.get(
  '/get-account-details/:userEmail',
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
router.patch('/update-profile', auth.verify(), profileController.updateProfile);
router.patch(
  '/change-password',
  auth.verify(),
  profileController.changePassword,
);

// tutors
router.get('/tutors', auth.verify(), tutorsController.fetchTutors);
router.get('/tutors/:id', auth.verify(), tutorsController.getTutorDetails);
router.get('/tutors/:id/sessions', auth.verify(), tutorsController.getTutorSessions);

// booking
router.post('/book/order', auth.verify(), bookingController.createOrder);
router.post('/book/verify', auth.verify(), bookingController.verifyPayment);
router.post('/book/wallet', auth.verify(), bookingController.bookWithWallet);
router.get('/bookings', auth.verify(), bookingController.getBookings);
router.patch('/bookings/:id/cancel', auth.verify(), bookingController.cancelBooking);
router.post('/bookings/:id/ping', auth.verify(), bookingController.pingSession);

// wallet
router.get('/wallet', auth.verify(), walletController.getTransactions);

// reviews
router.get('/tutors/:tutorId/reviews', auth.verify(), reviewController.getReviews);
router.post('/reviews', auth.verify(), reviewController.addReview);
router.patch('/reviews/:id', auth.verify(), reviewController.updateReview);
router.delete('/reviews/:id', auth.verify(), reviewController.deleteReview);
router.get('/tutors/:tutorId/review-eligibility', auth.verify(), reviewController.checkEligibility);

// feedback
router.get('/feedback/booking/:bookingId', auth.verify(), feedbackController.getFeedbackByBooking);
router.get('/feedback/feed', auth.verify(), feedbackController.getUserFeedbackFeed);
router.get('/feedback/progress', auth.verify(), feedbackController.getUserLanguageProgress);

// chat
router.get('/chats', auth.verify(), chatController.getConversations);
router.get('/chats/:conversationId/messages', auth.verify(), chatController.getMessages);
router.post('/chats/messages', auth.verify(), chatController.sendMessage);
router.post('/chats/attachments', auth.verify(), uploadMiddleware, chatController.uploadAttachment);
router.get('/chats/search', auth.verify(), chatController.search);
router.patch('/chats/messages/:messageId', auth.verify(), chatController.editMessage);
router.delete('/chats/messages/:messageId', auth.verify(), chatController.deleteMessage);

// quiz
router.post('/quizzes', auth.verify(), quizController.generateQuiz);
router.post('/quizzes/check-answer', auth.verify(), quizController.checkAnswer);
router.post('/quizzes/complete', auth.verify(), quizController.completeQuiz);
router.get('/quizzes/history', auth.verify(), quizController.getHistory);
router.get('/quizzes/leaderboard', auth.verify(), quizController.getLeaderboard);

// abuse reports
router.post('/reports', auth.verify(), abuseReportController.createReport);
router.get('/reports', auth.verify(), abuseReportController.getMyReports);

// notifications
router.use('/notifications', getNotificationRouter(auth));

export const userRouter = router;
