/**
 * A marker interface for a request that returns a response.
 * @template TResponse The type of the response.
 */
export interface IRequest<TResponse> {}

export type RequestConstructor<TResponse> = new (...args: any[]) => IRequest<TResponse>;
