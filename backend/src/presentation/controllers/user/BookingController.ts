import { Request, Response, NextFunction } from 'express';
import { IPingBookingUseCase } from '~use-case-interfaces/shared/IPingBookingUseCase';
import { httpStatusCode } from '~constants/httpStatusCode';
import { successMessage } from '~constants/successMessage';
import { logger } from '~logger/logger';
import { GetBookingsDTO } from '~dtos/GetBookingsDTO';
import { ICancelBookingUseCase } from '~use-case-interfaces/shared/ICancelBookingUseCase';
import { IGetBookingsUseCase } from '~use-case-interfaces/shared/IGetBookingsUseCase';
import { ICreateBookingOrderUseCase, IVerifyPaymentAndBookUseCase, IBookWithWalletUseCase } from '~use-case-interfaces/user/IBookingUseCase';
import { IRescheduleBookingUseCase } from '~use-case-interfaces/shared/IRescheduleBookingUseCase';
import { RescheduleBookingDTO } from '~dtos/RescheduleBookingDTO';

interface IAuthenticatedRequest extends Request {
  user: {
    id: string;
    role: 'user' | 'tutor' | 'admin';
  };
}

/**
 * Controller for handling session bookings and payments.
 * Manages order creation, payment verification, and session status tracking (ping).
 */
export class BookingController {
  constructor(
    private _createBookingOrderUC: ICreateBookingOrderUseCase,
    private _verifyPaymentAndBookUC: IVerifyPaymentAndBookUseCase,
    private _bookWithWalletUC: IBookWithWalletUseCase,
    private _getBookingsUC: IGetBookingsUseCase,
    private _cancelBookingUC: ICancelBookingUseCase,
    private _pingBookingUC: IPingBookingUseCase,
    private _rescheduleBookingUC: IRescheduleBookingUseCase,
  ) { }

  /**
   * Initiates a booking by creating a payment order (e.g., Razorpay order).
   */
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount, currency, sessionId } = req.body;
      const user = (req as unknown as IAuthenticatedRequest).user;
      const order = await this._createBookingOrderUC.execute(amount, currency, sessionId, user.id);
      res.status(httpStatusCode.OK).json({
        success: true,
        message: successMessage.ORDER_CREATED,
        order,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Verifies the payment signature and completes the booking process.
   */
  verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        sessionId,
        tutorId,
        amount,
        currency,
      } = req.body;
      const user = (req as unknown as IAuthenticatedRequest).user;
      const userId = user.id;

      const booking = await this._verifyPaymentAndBookUC.execute({
        orderId,
        paymentId,
        signature,
        sessionId,
        userId: userId as string,
        tutorId,
        amount,
        currency,
      });

      res.status(httpStatusCode.OK).json({
        success: true,
        message: successMessage.BOOKING_SUCCESS,
        booking,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Books a session using the user's wallet balance.
   */
  bookWithWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, tutorId } = req.body;
      const user = (req as unknown as IAuthenticatedRequest).user;

      await this._bookWithWalletUC.execute({
        sessionId,
        userId: user.id,
        tutorId,
      });

      res.status(httpStatusCode.OK).json({
        success: true,
        message: successMessage.BOOKING_SUCCESS,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Fetches a list of bookings for the authenticated user (as student or tutor).
   */
  getBookings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as unknown as IAuthenticatedRequest).user;

      const isTutor = user.role === 'tutor';
      const userId = isTutor ? undefined : user.id;
      const tutorId = isTutor ? user.id : undefined;

      const requestDTO = new GetBookingsDTO({
        ...req.query as Record<string, string>,
        userId,
        tutorId,
      });

      const response = await this._getBookingsUC.execute(requestDTO);

      res.status(httpStatusCode.OK).json({
        success: true,
        ...response,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Cancels an existing booking.
   */
  cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as unknown as IAuthenticatedRequest).user;

      await this._cancelBookingUC.execute(id, user.id, user.role);

      res.status(httpStatusCode.OK).json({
        success: true,
        message: 'Booking cancelled successfully',
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Pings an active session to track presence and handle auto-completion logic.
   */
  pingSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as unknown as IAuthenticatedRequest).user;

      const response = await this._pingBookingUC.execute(id, user.role);

      res.status(httpStatusCode.OK).json({
        success: true,
        completed: response.completed,
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Reschedules an existing booking to a new session.
   */
  rescheduleBooking = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { newSessionId } = req.body;
      const user = (req as unknown as IAuthenticatedRequest).user;

      const dto = new RescheduleBookingDTO({ bookingId: id, newSessionId });

      await this._rescheduleBookingUC.execute(dto.bookingId, dto.newSessionId, user.id, user.role);

      res.status(httpStatusCode.OK).json({
        success: true,
        message: 'Session rescheduled successfully',
      });
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
