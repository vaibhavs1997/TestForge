// ErrorHandler - Centralized error handling middleware for Express

import { Request, Response, NextFunction } from 'express';
import { createErrorResponse, ERROR_CODES } from '../../shared/ApiResponse';
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotImplementedError,
  BadRequestError,
} from '../../shared/errors';

// Re-export AppError for convenience (legacy imports in some routes)
export { AppError };

/**
 * Maps error messages to appropriate status codes and error codes
 * This helps handle errors from use cases and other parts of the application
 * 
 * NOTE: New code should use custom error classes directly instead of relying
 * on this function's string matching, which is fragile.
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
    return new NotFoundError(message);
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
    return new ValidationError(message);
  }

  if (message.includes('already in progress')) {
    return new ConflictError(message);
  }

  if (message.includes('already exists') || message.includes('Only one default') || message.includes('duplicate')) {
    return new ConflictError(message);
  }

  if (message.includes('not yet implemented')) {
    return new NotImplementedError(message);
  }

  if (message.includes('Unauthorized') || message.includes('unauthorized')) {
    return new UnauthorizedError(message);
  }

  if (message.includes('Forbidden') || message.includes('forbidden')) {
    return new ForbiddenError(message);
  }

  // Default to 500
  return new BadRequestError(message);
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
