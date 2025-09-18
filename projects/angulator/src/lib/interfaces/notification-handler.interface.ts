import { INotification } from "./notification.interface";

export interface INotificationHandler<TNotification extends INotification> {
  handle(notification: TNotification): void;
}
