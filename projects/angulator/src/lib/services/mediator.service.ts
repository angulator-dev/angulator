import { Inject, Injectable, Injector, Optional, signal, WritableSignal } from '@angular/core';
import {
  NOTIFICATION_HANDLER_MAP,
  PIPELINE_BEHAVIORS,
  REQUEST_HANDLER_MAP,
} from '../injection-tokens';
import { from, isObservable, Observable, of } from 'rxjs';
import { IRequestHandler, RequestHandlerType } from '../interfaces/request-handler.interface';
import { IRequest, RequestConstructor } from '../interfaces/request.interface';
import { IPipelineBehavior } from '../interfaces/pipeline-behavior.interface';
import { INotification } from '../interfaces/notification.interface';
import { INotificationHandler } from '../interfaces/notification-handler.interface';

@Injectable({
  providedIn: 'root',
})
export class Mediator {
  constructor(
    @Inject(REQUEST_HANDLER_MAP)
    private readonly requestHandlerMap: Map<RequestConstructor<any>, RequestHandlerType>,
    @Inject(NOTIFICATION_HANDLER_MAP)
    private readonly notificationHandlerMap: Map<
      new (...args: any[]) => INotification,
      (new (...args: any[]) => INotificationHandler<any>)[]
    >,
    @Optional() @Inject(PIPELINE_BEHAVIORS) private readonly pipelineBehaviors: IPipelineBehavior[],
    private readonly injector: Injector
  ) {}

  send<TResponse>(request: IRequest<TResponse>): Observable<TResponse> {
    const handlerType = this.requestHandlerMap.get(
      request.constructor as RequestConstructor<TResponse>
    );

    if (!handlerType) {
      throw new Error(`No handler found for request: ${request.constructor.name}`);
    }

    const handler = this.injector.get(handlerType) as IRequestHandler<
      IRequest<TResponse>,
      TResponse
    >;

    const handle = () => {
      const result = handler.handle(request);
      if (isObservable(result)) {
        return result;
      }
      if (result instanceof Promise) {
        return from(result);
      }
      return of(result);
    };

    const pipeline = (this.pipelineBehaviors || []).reduceRight(
      (next, behavior) => () => behavior.handle(request, next),
      handle
    );

    return pipeline();
  }

  publish(notification: INotification): void {
    const handlerTypes = this.notificationHandlerMap.get(
      notification.constructor as new (...args: any[]) => INotification
    );

    if (handlerTypes) {
      handlerTypes.forEach((handlerType) => {
        const handler = this.injector.get(handlerType);
        handler.handle(notification);
      });
    }
  }
}
