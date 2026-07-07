import { Request, Response } from 'express';
import { 
  IGetNotificationsUseCase, 
  IMarkNotificationReadUseCase, 
  IMarkAllNotificationsReadUseCase, 
  IGetNotificationCountUseCase, 
} from '~use-case-interfaces/shared/INotificationUseCase';
import { NotificationMapper } from '~mappers/NotificationMapper';
import { logger } from '~logger/logger';
import { httpStatusCode } from '~constants/httpStatusCode';
import { successMessage } from '~constants/successMessage';
import { HttpError } from '~errors/HttpError';

/**
 * Controller for handling notification-related operations.
 * Manages fetching, marking as read, and counting notifications for the authenticated user.
 */
export class NotificationController {
  constructor(
    private _getNotificationsUseCase: IGetNotificationsUseCase,
    private _markNotificationReadUseCase: IMarkNotificationReadUseCase,
    private _markAllNotificationsReadUseCase: IMarkAllNotificationsReadUseCase,
    private _getNotificationCountUseCase: IGetNotificationCountUseCase,
  ) { }

  /**
   * Retrieves a paginated list of notifications for the current user.
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(httpStatusCode.UNAUTHORIZED).json({ message: 'Unauthorized' });
        return;
      }

      const { filter, page, limit } = req.query;
      const notifications = await this._getNotificationsUseCase.execute(
        userId,
        (filter as 'all' | 'unread') || 'all',
        Number(page) || 1,
        Number(limit) || 10,
      );

      res.status(httpStatusCode.OK).json({
        success: true,
        data: notifications.map(NotificationMapper.toResponseDTO),
      });
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id;
      const userId = req.user?.id;
      if (!userId) {
        res.status(httpStatusCode.UNAUTHORIZED).json({ message: 'Unauthorized' });
        return;
      }
      const success = await this._markNotificationReadUseCase.execute(id, userId);
      if (success) {
        res.status(httpStatusCode.OK).json({
          success: true,
          message: successMessage.NOTIFICATION_MARKED_READ,
        });
      } else {
        res.status(httpStatusCode.NOT_FOUND).json({ message: 'Notification not found' });
      }
    } catch (error) {
      logger.error('Error marking notification read:', error);
      if (error instanceof HttpError) {
        res.status(error.statusCode).json({ message: error.message });
      } else {
        res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
      }
    }
  }

  /**
   * Marks all notifications as read for the current user.
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(httpStatusCode.UNAUTHORIZED).json({ message: 'Unauthorized' });
        return;
      }

      await this._markAllNotificationsReadUseCase.execute(userId);
      res.status(httpStatusCode.OK).json({
        success: true,
        message: successMessage.ALL_NOTIFICATIONS_MARKED_READ,
      });
    } catch (error) {
      logger.error('Error marking all notifications read:', error);
      res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * Retrieves the count of unread notifications for the current user.
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(httpStatusCode.UNAUTHORIZED).json({ message: 'Unauthorized' });
        return;
      }

      const count = await this._getNotificationCountUseCase.execute(userId);
      res.status(httpStatusCode.OK).json({
        success: true,
        count,
      });
    } catch (error) {
      logger.error('Error fetching notification count:', error);
      res.status(httpStatusCode.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
    }
  }
}
