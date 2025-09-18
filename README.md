# Angulator

Angulator is a lightweight Angular [mediator](https://refactoring.guru/design-patterns/mediator) library, designed to simplify communication between different parts of your application using a request/response and notification/handler pattern.

**Disclaimer**: This is a project I made in my spare time for fun, but I hope someone gets some use out of it. Any comments, constructive criticism, ideas, or contributions are welcome.

## Features

- **Mediator Service**: A central `Mediator` service for dispatching requests and publishing notifications.
- **Requests & Handlers**: Define clear request objects and their corresponding handlers for a clean separation of concerns.
- **Notifications & Handlers**: Implement a pub/sub mechanism for broadcasting events and handling them across your application.
- **Pipeline Behaviors**: Intercept and modify the request handling process, enabling cross-cutting concerns like logging, validation, or caching.
- **Angular Integration**: Seamlessly integrates with Angular's dependency injection system.
- **Schematics**: Generate boilerplate code for requests, commands, and their handlers, accelerating development.

## Installation

To install Angulator, run:

```bash
npm install @angulator/angulator
```

## Usage

### 1. Provide Mediator

In your `AppModule` or any feature module, use the `provideMediator` function to register your request and notification handlers:

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideMediator } from '@angulator/angulator';
import { MyQueryHandler } from './my-query.handler';
import { MyCommandHandler } from './my-command.handler';

@NgModule({
  declarations: [
    // ...
  ],
  imports: [BrowserModule],
  providers: [provideMediator([MyQueryHandler, MyCommandHandler])],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### 2. Define a Request and its Handler

#### Request Interface (`IRequest<TResponse>`)

```typescript
// my-query.query.ts
import { IRequest } from '@angulator/angulator';

export class MyQuery implements IRequest<MyQueryResponse> {
  constructor(public readonly id: number) {}
}

export class MyQueryResponse {
  constructor(public readonly id: number, public readonly name: string) {}
}
```

#### Request Handler Interface (`IRequestHandler<TRequest, TResponse>`)

```typescript
// my-query.handler.ts
import { IRequestHandler, RequestHandler } from '@angulator/angulator';
import { MyQuery, MyQueryResponse } from './my-query.query';
import { Observable, of } from 'rxjs';

@RequestHandler(MyQuery)
export class MyQueryHandler implements IRequestHandler<MyQuery, MyQueryResponse> {
  handle(request: MyQuery): Observable<MyQueryResponse> {
    return of(new MyQueryResponse(request.id, `Hello from query ${request.id}`));
  }
}
```

### 3. Define a Command and its Handler

#### Command Interface (`IRequest<void>`)

```typescript
// my-command.command.ts
import { IRequest } from '@angulator/angulator';

export class MyCommand implements IRequest<void> {
  constructor(public readonly id: number, public readonly message: string) {}
}
```

#### Command Handler Interface (`IRequestHandler<TRequest, void>`)

```typescript
// my-command.handler.ts
import { IRequestHandler, RequestHandler } from '@angulator/angulator';
import { MyCommand } from './my-command.command';

@RequestHandler(MyCommand)
export class MyCommandHandler implements IRequestHandler<MyCommand, void> {
  handle(request: MyCommand): void {
    console.log(`Command received: ${request.message} for ID: ${request.id}`);
  }
}
```

### 4. Define a Notification and its Handler

#### Notification Interface (`INotification`)

```typescript
// user-created.notification.ts
import { INotification } from '@angulator/angulator';

export class UserCreatedNotification implements INotification {
  constructor(public readonly userId: number, public readonly username: string) {}
}
```

#### Notification Handler Interface (`INotificationHandler<TNotification>`)

```typescript
// user-created.handler.ts
import { INotificationHandler, NotificationHandler } from '@angulator/angulator';
import { UserCreatedNotification } from './user-created.notification';

@NotificationHandler(UserCreatedNotification)
export class UserCreatedNotificationHandler
  implements INotificationHandler<UserCreatedNotification>
{
  handle(notification: UserCreatedNotification): void {
    console.log(`User created: ${notification.username} with ID: ${notification.userId}`);
  }
}
```

### 5. Using the Mediator

Inject the `Mediator` service into your components or services and use its `send` and `publish` methods:

```typescript
import { Component, OnDestroy, inject } from '@angular/core';
import { Mediator } from '@angulator/angulator';
import { MyQuery, MyQueryResponse } from './my-query.query';
import { MyCommand } from './my-command.command';
import { UserCreatedNotification } from './user-created.notification';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  template: `
    <button (click)="sendQuery()">Send Query</button>
    <button (click)="sendCommand()">Send Command</button>
    <button (click)="publishNotification()">Publish Notification</button>
  `,
})
export class AppComponent {
  private readonly _mediator = inject(Mediator);

  public readonly queryResponse = toSignal(
    this.query$.pipe(
      filter((id: number | null) => id !== null),
      switchMap((id: number) => this._mediator.send(new MyQuery(id)))
    )
  );

  private readonly _query = new BehaviorSubject<number | null>(null);
  public readonly query$ = this._query.asObservable();

  public sendQuery(id: number): void {
    this._query.next(id);
  }

  public sendCommand(): void {
    const command: MyCommand = new MyCommand(2, 'Perform an action');
    this.mediator.send(command); // Commands typically return void
  }

  public publishNotification(): void {
    const notification: UserCreatedNotification = new UserCreatedNotification(3, 'JohnDoe');
    this.mediator.publish(notification);
  }
}
```

### 6. Pipeline Behaviors

Implement `IPipelineBehavior` to create custom behaviors that can intercept requests.

```typescript
// logging.behavior.ts
import { IPipelineBehavior, IRequest, RequestHandlerDelegate } from '@angulator/angulator';
import { Injectable } from '@angular/core';

@Injectable()
export class LoggingBehavior implements IPipelineBehavior {
  public handle<TRequest extends IRequest<TResponse>, TResponse>(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>
  ): TResponse {
    console.log(`[LoggingBehavior] Handling request: ${request.constructor.name}`);
    const result: TResponse = next();
    console.log(`[LoggingBehavior] Finished handling request: ${request.constructor.name}`);
    return result;
  }
}
```

To register pipeline behaviors, provide them in your module:

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideMediator, PIPELINE_BEHAVIORS } from '@angulator/angulator';
import { MyQueryHandler } from './my-query.handler';
import { LoggingBehavior } from './logging.behavior';

@NgModule({
  // ...
  providers: [
    provideMediator([MyQueryHandler]),
    { provide: PIPELINE_BEHAVIORS, useClass: LoggingBehavior, multi: true },
  ],
  // ...
})
export class AppModule {}
```

## Schematics

Angulator provides schematics to quickly generate boilerplate code for your requests, commands, and their handlers.

To use the schematics, ensure you have `@angular/cli` installed globally or locally in your project.

### Generate a Query and its Handler

```bash
ng generate @angulator/angulator:query <name> --project=angulator
```

This will generate:

- `<name>.query.ts`: Defines the query class (implementing `IRequest`) and a response class.
- `<name>.handler.ts`: Defines the query handler class (implementing `IRequestHandler`) and is decorated with `@RequestHandler`.

Example:

```bash
ng generate @angulator/angulator:query GetUser --project=angulator
```

### Generate a Command and its Handler

```bash
ng generate @angulator/angulator:command <name> --project=angulator
```

This will generate:

- `<name>.command.ts`: Defines the command class (implementing `IRequest<void>`).
- `<name>.handler.ts`: Defines the command handler class (implementing `IRequestHandler<Command, void>`) and is decorated with `@RequestHandler`.

Example:

```bash
ng generate @angulator/angulator:command CreateUser --project=angulator
```

## Public API

The following are the main exports from the `angulator` library that you will typically interact with:

- `Mediator`: The core service for sending requests and publishing notifications.
- `IRequest<TResponse>`: Interface for defining request objects.
- `IRequestHandler<TRequest, TResponse>`: Interface for implementing request handlers.
- `@RequestHandler(RequestConstructor)`: Decorator to link a request to its handler.
- `INotification`: Interface for defining notification objects.
- `INotificationHandler<TNotification>`: Interface for implementing notification handlers.
- `@NotificationHandler(NotificationConstructor)`: Decorator to link a notification to its handler.
- `IPipelineBehavior`: Interface for creating custom pipeline behaviors to intercept requests.
- `provideMediator(handlers: any[])`: Function to set up and register your handlers with the mediator.
- `PIPELINE_BEHAVIORS`: Injection token used to provide custom pipeline behaviors.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
