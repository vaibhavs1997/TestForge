/**
 * Shared axios instance for API modules (auth headers).
 * Paths must include API_BASE_URL — see ApiClient and other callers.
 */
import axios from 'axios';
import { getAuthAuthorizationHeader, notifyUnauthorized } from './authSession';

export const apiAxios = axios.create();

apiAxios.interceptors.request.use((config) => {
  const authorization = getAuthAuthorizationHeader();
  if (authorization) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = authorization;
    }
  }
  return config;
});

apiAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? '');
    if (
      status === 401
      && !url.includes('/auth/login')
      && !url.includes('/auth/register')
      && !url.includes('/auth/config')
    ) {
      notifyUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default apiAxios;
