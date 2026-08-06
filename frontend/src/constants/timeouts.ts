/**
 * Frontend Timeout and Polling Constants
 * Default timeout values and polling intervals used throughout the frontend
 */

/** Default timeout for HTTP requests (in milliseconds) */
export const DEFAULT_TIMEOUT_MS = 30000;

/** Polling interval for execution status updates (in milliseconds) */
export const EXECUTION_POLLING_INTERVAL_MS = 3000;

/** Polling interval for pipeline status updates (in milliseconds) */
export const PIPELINE_POLLING_INTERVAL_MS = 3000;

/** Default toast notification display duration (in milliseconds) */
export const TOAST_DURATION_MS = 3000;

/** Polling interval for notification inbox (in milliseconds) */
export const NOTIFICATION_INBOX_POLL_INTERVAL_MS = 4000;

/** React Query default stale time for queries (in milliseconds) */
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** React Query default stale time for AI provider queries (in milliseconds) */
export const AI_PROVIDER_STALE_TIME_MS = 10 * 60 * 1000; // 10 minutes

/** React Query default retry count for failed queries */
export const DEFAULT_QUERY_RETRY_COUNT = 1;
