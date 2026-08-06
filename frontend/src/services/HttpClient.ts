/**
 * Shared HTTP Client
 * Centralized API communication with error handling
 */

import { API_BASE_URL } from '../constants/api';

export interface ApiError {
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = import.meta.env.VITE_API_KEY;
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  async patch<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  async put<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  private async handleError(response: Response): Promise<ApiError> {
    let errorBody: Record<string, any> = {};
    
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText };
    }

    return {
      message: errorBody.message || errorBody.error || `HTTP ${response.status}: ${response.statusText}`,
      statusCode: response.status,
      details: errorBody,
    };
  }
}

export const httpClient = new HttpClient();