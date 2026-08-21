/**
 * Error Response Builder Utility
 * Provides consistent error response formatting across the API
 */

import { ApiErrorResponse } from '../../interfaces/types/ApiResponse.js';

export class ErrorResponseBuilder {
  /**
   * Build a 400 Bad Request error response
   */
  static badRequest(message: string, details?: Record<string, any>): ApiErrorResponse {
    return {
      success: false,
      message,
      error: {
        code: 'VALIDATION_ERROR',
        message,
      },
      details,
      timestamp: Date.now(),
    };
  }

  /**
   * Build a 404 Not Found error response
   */
  static notFound(message: string, details?: Record<string, any>): ApiErrorResponse {
    return {
      success: false,
      message,
      error: {
        code: 'NOT_FOUND',
        message,
      },
      details,
      timestamp: Date.now(),
    };
  }

  /**
   * Build a 409 Conflict error response
   */
  static conflict(message: string, details?: Record<string, any>): ApiErrorResponse {
    return {
      success: false,
      message,
      error: {
        code: 'CONFLICT',
        message,
      },
      details,
      timestamp: Date.now(),
    };
  }

  /**
   * Build a 500 Internal Server Error response
   */
  static internalServerError(
    message: string = 'Internal Server Error',
    details?: Record<string, any>
  ): ApiErrorResponse {
    return {
      success: false,
      message,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
      details,
      timestamp: Date.now(),
    };
  }

  /**
   * Build a custom error response with specific error code
   */
  static custom(
    statusCode: number,
    message: string,
    code: string,
    details?: Record<string, any>
  ): ApiErrorResponse {
    return {
      success: false,
      message,
      error: {
        code,
        message,
      },
      details,
      timestamp: Date.now(),
    };
  }

  /**
   * Parse and categorize error by status code
   * Returns appropriate error response based on error type
   */
  static fromError(error: any, defaultStatusCode: number = 500): ApiErrorResponse {
    const message = error?.message || 'An unexpected error occurred';

    if (message.includes('not found')) {
      return this.notFound(message);
    }
    if (message.includes('required') || message.includes('cannot be empty') || message.includes('validation')) {
      return this.badRequest(message);
    }
    if (message.includes('already exists') || message.includes('conflict')) {
      return this.conflict(message);
    }

    return this.internalServerError(message);
  }
}
