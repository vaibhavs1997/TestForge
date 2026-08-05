/**
 * Unified API Response Types
 * Ensures consistent response structures across all API endpoints
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  details?: Record<string, any>;
  timestamp?: number;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
  timestamp: number;
}

/**
 * Helper function to create a successful response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  details?: Record<string, any>
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    details,
    timestamp: Date.now(),
  };
}

/**
 * Helper function to create an error response
 */
export function createErrorResponse(
  message: string,
  code?: string,
  details?: Record<string, any>
): ApiErrorResponse {
  return {
    success: false,
    message,
    error: code ? { code, message } : undefined,
    details,
    timestamp: Date.now(),
  };
}
