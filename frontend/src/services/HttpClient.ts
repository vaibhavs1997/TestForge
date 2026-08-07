/**
 * Shared HTTP Client
 * Centralized API communication with error handling
 */

import { API_BASE_URL } from '../constants/api';
import { getAuthAuthorizationHeader, notifyUnauthorized } from './authSession';

export interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

interface SuccessEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

function unwrap<T>(body: SuccessEnvelope<T> | T): T {
  if (body && typeof body === 'object' && 'success' in body && (body as SuccessEnvelope<T>).success === true) {
    return (body as SuccessEnvelope<T>).data as T;
  }
  return body as T;
}

export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authorization = getAuthAuthorizationHeader();
    if (authorization) {
      headers.Authorization = authorization;
    }
    return headers;
  }

  private url(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalized}`;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const body = await response.json();
    return unwrap<T>(body);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const json = await response.json();
    return unwrap<T>(json);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const json = await response.json();
    return unwrap<T>(json);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const json = await response.json();
    return unwrap<T>(json);
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(this.url(path), {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    if (response.status === 204) {
      return;
    }

    const text = await response.text();
    if (!text) return;
    unwrap(JSON.parse(text));
  }

  private async handleError(response: Response, path: string): Promise<ApiError> {
    let errorBody: Record<string, unknown> = {};

    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }

    const apiError: ApiError = {
      message:
        (typeof errorBody.message === 'string' && errorBody.message) ||
        (typeof errorBody.error === 'string' && errorBody.error) ||
        `HTTP ${response.status}: ${response.statusText}`,
      statusCode: response.status,
      details: errorBody,
    };

    if (
      response.status === 401
      && !path.startsWith('/auth/login')
      && !path.startsWith('/auth/register')
      && path !== '/auth/config'
    ) {
      notifyUnauthorized();
    }

    return apiError;
  }
}

export const httpClient = new HttpClient();
