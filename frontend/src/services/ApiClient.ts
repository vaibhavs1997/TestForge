/**
 * Generic API Client Base Class
 * Provides common CRUD operations for RESTful API endpoints
 * Eliminates duplicate HTTP logic across service modules
 */

import axios, { AxiosRequestConfig, AxiosProgressEvent } from 'axios';
import { API_BASE_URL } from '../constants/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * Generic API Client for CRUD operations
 * @template T The data model type
 * 
 * Usage:
 * ```
 * class UserService extends ApiClient<UserDto> {
 *   constructor() {
 *     super('/projects/:projectId/users');
 *   }
 * }
 * 
 * const userService = new UserService();
 * const user = await userService.get(projectId, userId);
 * ```
 */
export class ApiClient<T = any> {
  protected baseUrl: string;

  constructor(protected endpoint: string) {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Replace route parameters in endpoint
   */
  protected resolveEndpoint(endpoint: string, projectId: string): string {
    return endpoint.replace(':projectId', projectId);
  }

  /**
   * List all resources for a project
   */
  async list<R = T>(projectId: string, params?: Record<string, any>): Promise<R[]> {
    try {
      const url = `${this.baseUrl}${this.resolveEndpoint(this.endpoint, projectId)}`;
      const { data } = await axios.get(url, { params });
      return data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get a single resource by ID
   */
  async get<R = T>(projectId: string, id: string): Promise<R> {
    try {
      const url = `${this.baseUrl}${this.resolveEndpoint(this.endpoint, projectId)}/${id}`;
      const { data } = await axios.get(url);
      return data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new resource
   */
  async create<R = T>(projectId: string, payload: any): Promise<R> {
    try {
      const url = `${this.baseUrl}${this.resolveEndpoint(this.endpoint, projectId)}`;
      const { data } = await axios.post(url, payload);
      return data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a resource using PUT
   */
  async update<R = T>(projectId: string, id: string, payload: any): Promise<R> {
    try {
      const url = `${this.baseUrl}${this.resolveEndpoint(this.endpoint, projectId)}/${id}`;
      const { data } = await axios.put(url, payload);
      return data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Partially update a resource using PATCH
   */
  async patch<R = T>(projectId: string, id: string, payload: any): Promise<R> {
    try {
      const url = `${this.baseUrl}${this.resolveEndpoint(this.endpoint, projectId)}/${id}`;
      const { data } = await axios.patch(url, payload);
      return data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a resource
   */
  async delete(projectId: string, id: string): Promise<void> {
    try {
      const url = `${this.baseUrl}${this.resolveEndpoint(this.endpoint, projectId)}/${id}`;
      await axios.delete(url);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * POST to a custom endpoint (for actions beyond standard CRUD)
   */
  protected async post<R = T>(
    path: string,
    payload?: any,
    config?: AxiosRequestConfig
  ): Promise<R> {
    try {
      const url = `${this.baseUrl}${path}`;
      const { data } = await axios.post(url, payload, config);
      return data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * GET from a custom endpoint
   */
  protected async getCustom<R = T>(
    path: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<R> {
    try {
      const url = `${this.baseUrl}${path}`;
      const { data } = await axios.get(url, { params, ...config });
      return data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   */
  protected handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'An error occurred';
      
      const apiError = new Error(message);
      (apiError as any).status = error.response?.status;
      (apiError as any).details = error.response?.data;
      
      return apiError;
    }

    return error instanceof Error ? error : new Error(String(error));
  }
}
