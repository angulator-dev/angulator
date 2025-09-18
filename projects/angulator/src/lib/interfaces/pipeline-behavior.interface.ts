import { IRequest } from './request.interface';

export type RequestHandlerDelegate<TResponse> = () => TResponse;

export interface IPipelineBehavior {
  handle<TRequest extends IRequest<TResponse>, TResponse>(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>
  ): TResponse;
}
