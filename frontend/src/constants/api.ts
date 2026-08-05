/**
 * Frontend API Configuration Constants
 * API endpoints, base URLs, and related configuration
 */

/** Default API base URL */
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/** AI Provider default configuration values */
export const AI_PROVIDER_DEFAULTS = {
  timeout: 30000,
  maxTokens: 2048,
  temperature: 0.7,
  topP: 1,
} as const;

/** Execution Profile default values */
export const EXECUTION_PROFILE_DEFAULTS = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
} as const;
