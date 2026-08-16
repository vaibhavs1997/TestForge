import type { AxiosRequestConfig, Method } from 'axios';
import { apiAxios } from './apiAxios';
import { toNormalizedApiError, unwrapApiData } from './apiHelpers';

async function request<T>(
  method: Method,
  url: string,
  config?: AxiosRequestConfig,
  data?: unknown,
): Promise<T> {
  try {
    const response = await apiAxios.request<T>({
      method,
      url,
      data,
      ...config,
    });
    return unwrapApiData(response.data as unknown as T);
  } catch (error) {
    throw toNormalizedApiError(error);
  }
}

export const apiRequest = {
  get: <T>(url: string, config?: AxiosRequestConfig) => request<T>('GET', url, config),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('POST', url, config, data),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('PUT', url, config, data),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => request<T>('PATCH', url, config, data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => request<T>('DELETE', url, config),
};

export default apiRequest;
