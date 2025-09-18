import { INotification } from '../interfaces/notification.interface';

export const NOTIFICATION_HANDLER_METADATA_KEY = 'NotificationHandlerMetadata';

export function NotificationHandler(
  notification: new (...args: any[]) => INotification
): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(NOTIFICATION_HANDLER_METADATA_KEY, notification, target);
  };
}
