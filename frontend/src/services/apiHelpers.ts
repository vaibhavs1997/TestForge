import axios from 'axios';

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface NormalizedApiError extends Error {
  status?: number;
  details?: unknown;
}

export function unwrapApiData<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}

export function unwrapApiArray<T>(payload: ApiEnvelope<T[]> | T[] | undefined | null): T[] {
  const data = unwrapApiData(payload ?? ([] as T[]));
  return Array.isArray(data) ? data : [];
}

export function getApiErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as Record<string, unknown> | string | undefined;
    if (responseData && typeof responseData === 'object') {
      const message = responseData.message;
      const nestedError = responseData.error;
      if (typeof message === 'string' && message) return message;
      if (typeof nestedError === 'string' && nestedError) return nestedError;
    }
    if (typeof responseData === 'string' && responseData) return responseData;
    if (error.message) return error.message;
    return fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return fallback;
}

export function toNormalizedApiError(error: unknown, fallback = 'An error occurred'): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const normalized = new Error(getApiErrorMessage(error, fallback)) as NormalizedApiError;
    normalized.status = error.response?.status;
    normalized.details = error.response?.data;
    return normalized;
  }

  if (error instanceof Error) {
    return error as NormalizedApiError;
  }

  return new Error(getApiErrorMessage(error, fallback)) as NormalizedApiError;
}
