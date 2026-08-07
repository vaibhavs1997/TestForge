// ErrorHandler - Centralized error handling middleware for Express

import { Request, Response, NextFunction } from 'express';
import { createErrorResponse, ERROR_CODES } from '../../shared/ApiResponse';

/**
 * AppError - Custom error class for application errors
 * Allows throwing errors with specific status codes and error codes
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errorCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Maps error messages to appropriate status codes and error codes
 * This helps handle errors from use cases and other parts of the application
 */
function mapErrorToAppError(err: any): AppError {
  if (err instanceof AppError) {
    return err;
  }

  const message = err?.message || 'Unknown error';

  // Map error messages to appropriate status codes and error codes
  if (
    message.includes('not found')
    || message.includes('does not exist')
    || message.includes('Not found')
    || message.includes('could not be resolved')
  ) {
    return new AppError(404, message, ERROR_CODES.NOT_FOUND);
  }

  if (
    message.includes('required')
    || message.includes('cannot be empty')
    || message.includes('must be')
    || message.includes('No file uploaded')
    || message.includes('Invalid ')
    || message.includes('Missing required fields')
    || message.includes('Self-referencing')
    || message.includes('Query parameter')
    || message.includes('No adapter')
    || message.includes('Unsupported ')
    || message.includes('Only Approved')
    || message.includes('No test designs')
    || message.includes('Test strategy not found')
  ) {
    return new AppError(400, message, ERROR_CODES.VALIDATION_ERROR);
  }

  if (message.includes('already exists') || message.includes('Only one default') || message.includes('duplicate')) {
    return new AppError(409, message, ERROR_CODES.CONFLICT);
  }

  if (message.includes('not yet implemented')) {
    return new AppError(501, message, ERROR_CODES.NOT_IMPLEMENTED);
  }

  if (message.includes('Unauthorized') || message.includes('unauthorized')) {
    return new AppError(401, message, ERROR_CODES.UNAUTHORIZED);
  }

  if (message.includes('Forbidden') || message.includes('forbidden')) {
    return new AppError(403, message, ERROR_CODES.FORBIDDEN);
  }

  // Default to 500
  return new AppError(500, message, ERROR_CODES.INTERNAL_SERVER_ERROR);
}

/**
 * Error handler middleware
 * Must be registered LAST, after all routes and other middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Convert any error to AppError
  const appError = mapErrorToAppError(err);

  // Log error for debugging
  console.error('[ErrorHandler]', {
    name: appError.name,
    message: appError.message,
    statusCode: appError.statusCode,
    errorCode: appError.errorCode,
    path: req.path,
    method: req.method,
  });

  // Send error response
  res.status(appError.statusCode).json(
    createErrorResponse(appError.message, appError.errorCode)
  );
};

/**
 * 404 Not Found handler
 * Must be registered BEFORE the error handler middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(404, `Route not found: ${req.method} ${req.path}`, ERROR_CODES.NOT_FOUND);
  next(error);
};
