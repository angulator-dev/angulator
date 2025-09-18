import { Provider } from '@angular/core';
import { Mediator } from './services/mediator.service';
import { NOTIFICATION_HANDLER_MAP, REQUEST_HANDLER_MAP } from './injection-tokens';
import 'reflect-metadata';
import { RequestHandlerType } from './interfaces/request-handler.interface';
import { REQUEST_HANDLER_METADATA_KEY } from './decorators/request-handler.decorator';
import { RequestConstructor } from './interfaces/request.interface';
import { INotification } from './interfaces/notification.interface';
import { NOTIFICATION_HANDLER_METADATA_KEY } from './decorators/notification-handler.decorator';
import { INotificationHandler } from './interfaces/notification-handler.interface';

export function provideMediator(
  handlers: (RequestHandlerType | (new (...args: any[]) => INotificationHandler<any>))[]
): Provider[] {
  const handlerMap = new Map<RequestConstructor<any>, RequestHandlerType>();
  const notificationHandlerMap = new Map<
    new (...args: any[]) => INotification,
    (new (...args: any[]) => INotificationHandler<any>)[]
  >();

  handlers.forEach((handler) => {
    const request = Reflect.getMetadata(REQUEST_HANDLER_METADATA_KEY, handler);
    if (request) {
      handlerMap.set(request, handler as RequestHandlerType);
    }

    const notification = Reflect.getMetadata(NOTIFICATION_HANDLER_METADATA_KEY, handler);
    if (notification) {
      const existing = notificationHandlerMap.get(notification) || [];
      notificationHandlerMap.set(notification, [
        ...existing,
        handler as new (...args: any[]) => INotificationHandler<any>,
      ]);
    }
  });

  return [
    Mediator,
    ...handlers,
    { provide: REQUEST_HANDLER_MAP, useValue: handlerMap },
    { provide: NOTIFICATION_HANDLER_MAP, useValue: notificationHandlerMap },
  ];
}
