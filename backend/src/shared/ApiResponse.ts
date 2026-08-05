// ApiResponse - Standardized response format for all API endpoints

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  details?: any;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Helper functions for creating standardized responses
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(
  message: string,
  errorCode?: string,
  details?: any
): ErrorResponse {
  return {
    success: false,
    message,
    errorCode,
    details: details || null,
  };
}

// Error codes - aligned with error handling patterns in controllers
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;
