import { InjectionToken } from '@angular/core';
import { IRequest } from './interfaces/request.interface';
import { IRequestHandler } from './interfaces/request-handler.interface';
import { IPipelineBehavior } from './interfaces/pipeline-behavior.interface';
import { INotificationHandler } from './interfaces/notification-handler.interface';
import { INotification } from './interfaces/notification.interface';

export const REQUEST_HANDLER_MAP = new InjectionToken<
  Map<IRequest<any>, new (...args: any[]) => IRequestHandler<any, any>>
>('REQUEST_HANDLER_MAP');
export const PIPELINE_BEHAVIORS = new InjectionToken<IPipelineBehavior[]>('PIPELINE_BEHAVIORS');
export const NOTIFICATION_HANDLER_MAP = new InjectionToken<
  Map<INotification, (new (...args: any[]) => INotificationHandler<any>)[]>
>('NOTIFICATION_HANDLER_MAP');
