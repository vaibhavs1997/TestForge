/**
 * Shared HTTP Client
 * Centralized API communication with error handling
 */

import { API_BASE_URL } from '../constants/api';
import { getAuthAuthorizationHeader, notifyUnauthorized } from './authSession';
import { getApiErrorMessage, unwrapApiData } from './apiHelpers';

export interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
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

  private buildRequestInit(method: string, body?: unknown): RequestInit {
    return {
      method,
      cache: 'no-store',
      headers: {
        ...this.buildHeaders(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(this.url(path), this.buildRequestInit('GET'));

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const body = await response.json();
    return unwrapApiData<T>(body);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), this.buildRequestInit('POST', body));

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const json = await response.json();
    return unwrapApiData<T>(json);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), this.buildRequestInit('PATCH', body));

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const json = await response.json();
    return unwrapApiData<T>(json);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.url(path), this.buildRequestInit('PUT', body));

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    const json = await response.json();
    return unwrapApiData<T>(json);
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(this.url(path), this.buildRequestInit('DELETE'));

    if (!response.ok) {
      throw await this.handleError(response, path);
    }

    if (response.status === 204) {
      return;
    }

    const text = await response.text();
    if (!text) return;
    unwrapApiData(JSON.parse(text));
  }

  private async handleError(response: Response, path: string): Promise<ApiError> {
    let errorBody: Record<string, unknown> = {};

    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }

    const apiError: ApiError = {
      message: getApiErrorMessage({ response: { data: errorBody } }, `HTTP ${response.status}: ${response.statusText}`),
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
