import { Provider, InjectionToken } from '@angular/core';
import 'reflect-metadata';
import { provideMediator } from './mediator.providers';
import { NOTIFICATION_HANDLER_MAP, REQUEST_HANDLER_MAP } from './injection-tokens';
import { REQUEST_HANDLER_METADATA_KEY } from './decorators/request-handler.decorator';
import { NOTIFICATION_HANDLER_METADATA_KEY } from './decorators/notification-handler.decorator';

// --- Mock Interfaces (for type safety in our mocks) ---
interface IRequest<TResponse> {}
interface INotification {}
interface IRequestHandler<TRequest, TResponse> {
  handle(request: TRequest): TResponse | Promise<TResponse> | any;
}
interface INotificationHandler<TNotification> {
  handle(notification: TNotification): void | Promise<void>;
}

// --- Mock Handlers, Requests, and Notifications ---

// Requests
class TestRequest implements IRequest<string> {}
class AnotherTestRequest implements IRequest<number> {}

// Notifications
class TestNotification implements INotification {}
class AnotherTestNotification implements INotification {}

// Request Handlers (cleaned up for consistency)
class TestRequestHandler implements IRequestHandler<TestRequest, string> {
  handle(request: TestRequest): string {
    return 'handled';
  }
}
class AnotherTestRequestHandler implements IRequestHandler<AnotherTestRequest, number> {
  handle(request: AnotherTestRequest): number {
    return 123;
  }
}

// Notification Handlers (cleaned up for consistency)
class TestNotificationHandler implements INotificationHandler<TestNotification> {
  handle(notification: TestNotification): void {}
}
// This now correctly and consistently handles TestNotification
class AnotherTestNotificationHandler implements INotificationHandler<TestNotification> {
  handle(notification: TestNotification): void {}
}
// This now correctly and consistently handles AnotherTestNotification
class YetAnotherNotificationHandler implements INotificationHandler<AnotherTestNotification> {
  handle(notification: AnotherTestNotification): void {}
}

// A class that is not a handler
class NonHandlerClass {}

describe('provideMediator', () => {
  // Global setup: Simulate the decorators by attaching metadata before tests run
  beforeAll(() => {
    Reflect.defineMetadata(REQUEST_HANDLER_METADATA_KEY, TestRequest, TestRequestHandler);
    Reflect.defineMetadata(
      REQUEST_HANDLER_METADATA_KEY,
      AnotherTestRequest,
      AnotherTestRequestHandler
    );
    Reflect.defineMetadata(
      NOTIFICATION_HANDLER_METADATA_KEY,
      TestNotification,
      TestNotificationHandler
    );
    Reflect.defineMetadata(
      NOTIFICATION_HANDLER_METADATA_KEY,
      TestNotification,
      AnotherTestNotificationHandler
    );
    Reflect.defineMetadata(
      NOTIFICATION_HANDLER_METADATA_KEY,
      AnotherTestNotification,
      YetAnotherNotificationHandler
    );
  });

  describe('when called with an empty array', () => {
    it('should return only the map providers with empty maps', () => {
      const providers = provideMediator([]);
      expect(providers.length).toBe(3);

      const requestMapProvider = providers.find(
        (p) => (p as any).provide === REQUEST_HANDLER_MAP
      ) as any;
      const notificationMapProvider = providers.find(
        (p) => (p as any).provide === NOTIFICATION_HANDLER_MAP
      ) as any;

      expect(requestMapProvider).toBeDefined();
      expect(notificationMapProvider).toBeDefined();
      expect(requestMapProvider.useValue.size).toBe(0);
      expect(notificationMapProvider.useValue.size).toBe(0);
    });
  });

  describe('when called with request handlers', () => {
    it('should register a single request handler', () => {
      const providers = provideMediator([TestRequestHandler]);
      const requestMapProvider = providers.find(
        (p) => (p as any).provide === REQUEST_HANDLER_MAP
      ) as any;

      expect(requestMapProvider).toBeDefined();
      const handlerMap = requestMapProvider.useValue;

      expect(handlerMap.size).toBe(1);
      expect(handlerMap.get(TestRequest)).toBe(TestRequestHandler);
      expect(providers).toContain(TestRequestHandler);
    });
  });

  describe('when called with notification handlers', () => {
    it('should register a single notification handler', () => {
      const providers = provideMediator([TestNotificationHandler]);
      const notificationMapProvider = providers.find(
        (p) => (p as any).provide === NOTIFICATION_HANDLER_MAP
      ) as any;

      expect(notificationMapProvider).toBeDefined();
      const notificationMap = notificationMapProvider.useValue;

      expect(notificationMap.size).toBe(1);
      expect(notificationMap.get(TestNotification)).toEqual([TestNotificationHandler]);
      expect(providers).toContain(TestNotificationHandler);
    });

    it('should register multiple handlers for the same notification', () => {
      const providers = provideMediator([TestNotificationHandler, AnotherTestNotificationHandler]);
      const notificationMapProvider = providers.find(
        (p) => (p as any).provide === NOTIFICATION_HANDLER_MAP
      ) as any;

      expect(notificationMapProvider).toBeDefined();
      const notificationMap = notificationMapProvider.useValue;

      expect(notificationMap.size).toBe(1);
      expect(notificationMap.get(TestNotification)).toEqual([
        TestNotificationHandler,
        AnotherTestNotificationHandler,
      ]);
    });
  });

  describe('when called with a mix of handlers', () => {
    it('should register all handlers correctly and include them in the providers array', () => {
      const handlers = [
        TestRequestHandler,
        AnotherTestRequestHandler,
        TestNotificationHandler,
        AnotherTestNotificationHandler,
        YetAnotherNotificationHandler,
        NonHandlerClass as any,
      ];
      const providers = provideMediator(handlers);

      // Check for the handler classes themselves
      expect(providers).toContain(TestRequestHandler);
      expect(providers).toContain(AnotherTestRequestHandler);
      expect(providers).toContain(TestNotificationHandler);
      expect(providers).toContain(AnotherTestNotificationHandler);
      expect(providers).toContain(YetAnotherNotificationHandler);
      expect(providers).toContain(NonHandlerClass);

      // Check request handler map
      const requestMapProvider = providers.find(
        (p) => (p as any).provide === REQUEST_HANDLER_MAP
      ) as any;
      expect(requestMapProvider).toBeDefined();
      const requestMap = requestMapProvider.useValue;
      expect(requestMap.size).toBe(2);
      expect(requestMap.get(TestRequest)).toBe(TestRequestHandler);
      expect(requestMap.get(AnotherTestRequest)).toBe(AnotherTestRequestHandler);

      // Check notification handler map
      const notificationMapProvider = providers.find(
        (p) => (p as any).provide === NOTIFICATION_HANDLER_MAP
      ) as any;
      expect(notificationMapProvider).toBeDefined();
      const notificationMap = notificationMapProvider.useValue;
      expect(notificationMap.size).toBe(2);
      expect(notificationMap.get(TestNotification)).toEqual([
        TestNotificationHandler,
        AnotherTestNotificationHandler,
      ]);
      expect(notificationMap.get(AnotherTestNotification)).toEqual([YetAnotherNotificationHandler]);
    });
  });
});
