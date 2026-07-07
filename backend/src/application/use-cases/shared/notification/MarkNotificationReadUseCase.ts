import { INotificationRepository } from '~repository-interfaces/INotificationRepository';
import { IMarkNotificationReadUseCase } from '~use-case-interfaces/shared/INotificationUseCase';
import { NotFoundError, ForbiddenError } from '~errors/HttpError';

export class MarkNotificationReadUseCase implements IMarkNotificationReadUseCase {
  constructor(private _notificationRepository: INotificationRepository) { }

  async execute(notificationId: string, userId: string): Promise<boolean> {
    const notification = await this._notificationRepository.findOneById(notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenError('Not authorized');
    }

    const updated = await this._notificationRepository.updateOneById(notificationId, {
      isRead: true,
    });
    return !!updated;
  }
}
