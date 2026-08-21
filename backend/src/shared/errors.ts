// Custom error classes for type-safe error handling
import { ERROR_CODES } from './ApiResponse.js';

/**
 * AppError - Base custom error class for application errors
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
 * NotFoundError - Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, ERROR_CODES.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

/**
 * ValidationError - Input validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, ERROR_CODES.VALIDATION_ERROR);
    this.name = 'ValidationError';
  }
}

/**
 * ConflictError - Resource conflicts (duplicate, already exists)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, ERROR_CODES.CONFLICT);
    this.name = 'ConflictError';
  }
}

/**
 * UnauthorizedError - Authentication errors
 */
export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(401, message, ERROR_CODES.UNAUTHORIZED);
    this.name = 'UnauthorizedError';
  }
}

/**
 * ForbiddenError - Authorization errors (insufficient permissions)
 */
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message, ERROR_CODES.FORBIDDEN);
    this.name = 'ForbiddenError';
  }
}

/**
 * NotImplementedError - Feature not yet implemented
 */
export class NotImplementedError extends AppError {
  constructor(message: string) {
    super(501, message, ERROR_CODES.NOT_IMPLEMENTED);
    this.name = 'NotImplementedError';
  }
}

/**
 * BadRequestError - General bad request errors
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, ERROR_CODES.BAD_REQUEST);
    this.name = 'BadRequestError';
  }
}