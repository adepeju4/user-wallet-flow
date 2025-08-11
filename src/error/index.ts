import { Response, Request } from 'express';
import { sendResponse } from '../utils/sendResponse';
import logger from '../utils/logger';


export class BaseError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UserError extends BaseError {
  errors?: Record<string, unknown>;

  constructor(message: string, errors?: Record<string, unknown>) {
    super(message, 400);
    if (errors !== undefined) {
      this.errors = errors;
    }
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class DuplicateResourceError extends BaseError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ServerError extends BaseError {
  constructor(message: string) {
    super(message, 500);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string) {
    super(message, 503);
  }
}

export const UserErrorHandler = (error: BaseError, _: Request, res: Response) => {
  logger.error(error.message, { STACK_TRACE: error, DATE: new Date() });
  return sendResponse({
    res,
    statusCode: error.statusCode,
    message: error.message,
  });
};

export const NotFoundErrorHandler = (_: Request, res: Response) => {
  const error = new NotFoundError('Resource not found.');
  const { statusCode = 404, message = 'Resource not found.' } = error;
  logger.error(message, { STACK_TRACE: error, DATE: new Date() });
  return sendResponse({
    res,
    message,
    statusCode,
  });
};

export const ServerErrorHandler = (error: BaseError, _: Request, res: Response) => {
  logger.error(error.message, { STACK_TRACE: error, DATE: new Date() });
  console.log('error', error);
  return sendResponse({
    res,
    statusCode: error.statusCode,
    message: error.message || 'Internal server error',
  });
};
