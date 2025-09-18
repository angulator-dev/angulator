import { TestBed } from '@angular/core/testing';
import { Injector, provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Mediator } from './mediator.service';
import {
  NOTIFICATION_HANDLER_MAP,
  PIPELINE_BEHAVIORS,
  REQUEST_HANDLER_MAP,
} from '../injection-tokens';
import { IRequest } from '../interfaces/request.interface';
import { IRequestHandler } from '../interfaces/request-handler.interface';
import { IPipelineBehavior } from '../interfaces/pipeline-behavior.interface';
import { INotification } from '../interfaces/notification.interface';
import { INotificationHandler } from '../interfaces/notification-handler.interface';

// --- Mock Implementations ---

// Requests
class SyncRequest implements IRequest<string> {}
class AsyncObservableRequest implements IRequest<string> {}
class AsyncPromiseRequest implements IRequest<string> {}
class UnhandledRequest implements IRequest<string> {}

// Notifications
class TestNotification implements INotification {}
class AnotherNotification implements INotification {}

// Request Handlers
class SyncRequestHandler implements IRequestHandler<SyncRequest, string> {
  handle(request: SyncRequest): string {
    return 'sync response';
  }
}

class AsyncObservableRequestHandler implements IRequestHandler<AsyncObservableRequest, string> {
  handle(request: AsyncObservableRequest): Observable<string> {
    return of('async observable response');
  }
}
class ErrorObservableRequestHandler implements IRequestHandler<AsyncObservableRequest, string> {
  handle(request: AsyncObservableRequest): Observable<string> {
    return throwError(() => new Error('Observable Error'));
  }
}

class AsyncPromiseRequestHandler implements IRequestHandler<AsyncPromiseRequest, string> {
  async handle(request: AsyncPromiseRequest): Promise<string> {
    return Promise.resolve('async promise response');
  }
}
class ErrorPromiseRequestHandler implements IRequestHandler<AsyncPromiseRequest, string> {
  async handle(request: AsyncPromiseRequest): Promise<string> {
    return Promise.reject(new Error('Promise Error'));
  }
}

// Notification Handlers
class TestNotificationHandler implements INotificationHandler<TestNotification> {
  handle(notification: TestNotification): void {
    // Logic for handling notification
  }
}
class AnotherTestNotificationHandler implements INotificationHandler<TestNotification> {
  handle(notification: TestNotification): void {
    // Logic for handling another notification
  }
}

// --- Tests ---

describe('Mediator', () => {
  let mediator: Mediator;
  let injector: Injector;
  let requestHandlerMap: Map<any, any>;
  let notificationHandlerMap: Map<any, any>;
  let pipelineBehaviors: IPipelineBehavior[];

  // --- Global Setup ---
  beforeEach(() => {
    // Reset mocks for each test to ensure isolation
    requestHandlerMap = new Map();
    notificationHandlerMap = new Map();
    pipelineBehaviors = [];

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        Mediator,
        { provide: REQUEST_HANDLER_MAP, useValue: requestHandlerMap },
        { provide: NOTIFICATION_HANDLER_MAP, useValue: notificationHandlerMap },
        { provide: PIPELINE_BEHAVIORS, useFactory: () => pipelineBehaviors },
        // Provide all handlers so the injector can find them
        SyncRequestHandler,
        AsyncObservableRequestHandler,
        ErrorObservableRequestHandler,
        AsyncPromiseRequestHandler,
        ErrorPromiseRequestHandler,
        TestNotificationHandler,
        AnotherTestNotificationHandler,
      ],
    });

    mediator = TestBed.inject(Mediator);
    injector = TestBed.inject(Injector); // The TestBed acts as the injector
  });

  // --- Method Tests ---

  describe('#send', () => {
    it('should throw an error if no handler is found for the request', () => {
      const request = new UnhandledRequest();
      // The error is thrown synchronously during handler resolution
      expect(() => mediator.send(request)).toThrowError(
        'No handler found for request: UnhandledRequest'
      );
    });

    it('should return an observable with the value from a synchronous handler', (done) => {
      requestHandlerMap.set(SyncRequest, SyncRequestHandler);
      const request = new SyncRequest();

      mediator.send(request).subscribe((response) => {
        expect(response).toBe('sync response');
        done();
      });
    });

    it('should return the original observable from an async observable handler', (done) => {
      requestHandlerMap.set(AsyncObservableRequest, AsyncObservableRequestHandler);
      const request = new AsyncObservableRequest();

      mediator.send(request).subscribe((response) => {
        expect(response).toBe('async observable response');
        done();
      });
    });

    it('should return an observable with the resolved value from an async promise handler', (done) => {
      requestHandlerMap.set(AsyncPromiseRequest, AsyncPromiseRequestHandler);
      const request = new AsyncPromiseRequest();

      mediator.send(request).subscribe((response) => {
        expect(response).toBe('async promise response');
        done();
      });
    });

    it('should execute pipeline behaviors in the correct order before calling the handler', (done) => {
      requestHandlerMap.set(SyncRequest, SyncRequestHandler);
      const request = new SyncRequest();
      const handler = TestBed.inject(SyncRequestHandler);
      spyOn(handler, 'handle').and.callFake(() => {
        callOrder.push('handler called');
        return 'sync response';
      });

      const callOrder: string[] = [];

      const behavior1: IPipelineBehavior = {
        handle: (req, next) => {
          callOrder.push('behavior1 start');
          const result = next();
          callOrder.push('behavior1 end');
          return result;
        },
      };
      const behavior2: IPipelineBehavior = {
        handle: (req, next) => {
          callOrder.push('behavior2 start');
          const result = next();
          callOrder.push('behavior2 end');
          return result;
        },
      };

      pipelineBehaviors.push(behavior1, behavior2);
      spyOn(behavior1, 'handle').and.callThrough();
      spyOn(behavior2, 'handle').and.callThrough();

      mediator.send(request).subscribe(() => {
        expect(behavior1.handle).toHaveBeenCalled();
        expect(behavior2.handle).toHaveBeenCalled();
        expect(handler.handle).toHaveBeenCalled();
        // reduceRight means behaviors are nested in reverse order of the array
        expect(callOrder).toEqual([
          'behavior1 start',
          'behavior2 start',
          'handler called',
          'behavior2 end',
          'behavior1 end',
        ]);
        done();
      });
    });
  });

  describe('#sendAsync', () => {
    it('should resolve a promise with the value from an observable handler', async () => {
      requestHandlerMap.set(AsyncObservableRequest, AsyncObservableRequestHandler);
      const request = new AsyncObservableRequest();

      const response = await mediator.sendAsync(request);
      expect(response).toBe('async observable response');
    });

    it('should resolve a promise with the value from a promise handler', async () => {
      requestHandlerMap.set(AsyncPromiseRequest, AsyncPromiseRequestHandler);
      const request = new AsyncPromiseRequest();

      const response = await mediator.sendAsync(request);
      expect(response).toBe('async promise response');
    });

    it('should reject the promise if the observable handler throws an error', async () => {
      requestHandlerMap.set(AsyncObservableRequest, ErrorObservableRequestHandler);
      const request = new AsyncObservableRequest();

      await expectAsync(mediator.sendAsync(request)).toBeRejectedWithError('Observable Error');
    });

    it('should reject the promise if the promise handler throws an error', async () => {
      requestHandlerMap.set(AsyncPromiseRequest, ErrorPromiseRequestHandler);
      const request = new AsyncPromiseRequest();

      await expectAsync(mediator.sendAsync(request)).toBeRejectedWithError('Promise Error');
    });
  });

  describe('#sendSimple', () => {
    it('should return the direct result from a synchronous handler', () => {
      requestHandlerMap.set(SyncRequest, SyncRequestHandler);
      const request = new SyncRequest();

      const response = mediator.sendSimple(request);
      expect(response).toBe('sync response');
    });

    it('should throw an error if the handler returns an Observable', () => {
      requestHandlerMap.set(AsyncObservableRequest, AsyncObservableRequestHandler);
      const request = new AsyncObservableRequest();

      expect(() => mediator.sendSimple(request)).toThrowError(
        'sendSimple can only be used with synchronous handlers'
      );
    });

    it('should throw an error if the handler returns a Promise', () => {
      requestHandlerMap.set(AsyncPromiseRequest, AsyncPromiseRequestHandler);
      const request = new AsyncPromiseRequest();

      expect(() => mediator.sendSimple(request)).toThrowError(
        'sendSimple can only be used with synchronous handlers'
      );
    });
  });

  describe('#publish', () => {
    it('should do nothing if no handlers are found for a notification', () => {
      const injectorSpy = spyOn(injector, 'get').and.callThrough();
      const notification = new AnotherNotification(); // No handler registered for this

      mediator.publish(notification);

      // `get` should not be called for any handlers
      expect(injectorSpy).not.toHaveBeenCalledWith(TestNotificationHandler);
    });

    it('should call the handle method of a single registered handler', () => {
      notificationHandlerMap.set(TestNotification, [TestNotificationHandler]);
      const handler = TestBed.inject(TestNotificationHandler);
      const handlerSpy = spyOn(handler, 'handle');
      const notification = new TestNotification();

      mediator.publish(notification);

      expect(handlerSpy).toHaveBeenCalledOnceWith(notification);
    });

    it('should call the handle method of all registered handlers for a notification', () => {
      notificationHandlerMap.set(TestNotification, [
        TestNotificationHandler,
        AnotherTestNotificationHandler,
      ]);
      const handler1 = TestBed.inject(TestNotificationHandler);
      const handler2 = TestBed.inject(AnotherTestNotificationHandler);

      const handler1Spy = spyOn(handler1, 'handle');
      const handler2Spy = spyOn(handler2, 'handle');

      const notification = new TestNotification();

      mediator.publish(notification);

      expect(handler1Spy).toHaveBeenCalledOnceWith(notification);
      expect(handler2Spy).toHaveBeenCalledOnceWith(notification);
    });
  });
});
