import { Notification } from '~entities/Notification';

export interface ICreateNotificationUseCase {
  execute(data: {
    recipientId: string;
    recipientRole: 'user' | 'tutor';
    message: string;
    type: 'booking' | 'cancellation' | 'message' | 'system';
  }): Promise<Notification>;
}

export interface IGetNotificationsUseCase {
  execute(
    userId: string,
    filter: 'all' | 'unread',
    page: number,
    limit: number
  ): Promise<Notification[]>;
}

export interface IMarkNotificationReadUseCase {
  execute(id: string, userId: string): Promise<boolean>;
}

export interface IMarkAllNotificationsReadUseCase {
  execute(userId: string): Promise<void | boolean>;
}

export interface IGetNotificationCountUseCase {
  execute(userId: string): Promise<number>;
}
