import { RequestConstructor } from '../interfaces/request.interface';

export const REQUEST_HANDLER_METADATA_KEY = 'RequestHandlerMetadata';

export function RequestHandler<TResponse>(request: RequestConstructor<TResponse>): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(REQUEST_HANDLER_METADATA_KEY, request, target);
  };
}
