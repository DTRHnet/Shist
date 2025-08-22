export type ErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL';

export class ApiError extends Error {
  status: number;
  code: ErrorCode;
  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string) => new ApiError(400, 'BAD_REQUEST', message);
export const unauthorized = (message = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Forbidden') => new ApiError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Not found') => new ApiError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new ApiError(409, 'CONFLICT', message);
export const internal = (message = 'Internal server error') => new ApiError(500, 'INTERNAL', message);

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return { status: error.status, body: { error: { code: error.code, message: error.message } } };
  }
  const message = error instanceof Error ? error.message : 'Unknown error';
  return { status: 500, body: { error: { code: 'INTERNAL', message } } };
}