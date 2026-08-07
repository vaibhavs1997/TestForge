/**
 * Shared axios instance for API modules (auth headers).
 * Paths must include API_BASE_URL — see ApiClient and other callers.
 */
import axios from 'axios';
import { getAuthAuthorizationHeader } from './authSession';

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
export default apiAxios;
