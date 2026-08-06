/**
 * Shared axios instance for API modules (auth headers).
 * Paths must include API_BASE_URL — see ApiClient and other callers.
 */
import axios from 'axios';

export const apiAxios = axios.create();

apiAxios.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (typeof apiKey === 'string' && apiKey.length > 0) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${apiKey}`;
    }
  }
  return config;
});

export default apiAxios;
