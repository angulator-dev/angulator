import { Observable } from 'rxjs';
import { IRequest } from './request.interface';

export type RequestHandlerType = new (...args: any[]) => IRequestHandler<any, any>;

/**
 * Defines a handler for a request.
 * @template TRequest The type of the request.
 * @template TResponse The type of the response.
 */
export interface IRequestHandler<TRequest extends IRequest<TResponse>, TResponse> {
  /**
   * Handles a request.
   * @param request The request object.
   * @returns An Observable that emits the response.
   */
  handle(request: TRequest): Observable<TResponse> | Promise<TResponse> | TResponse;
}
