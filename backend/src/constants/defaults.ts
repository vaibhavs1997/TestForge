/**
 * Backend Default Constants
 * Centralized configuration values for timeouts, retry policies, upload limits, and batch operations
 */

/** Default timeout for HTTP requests and operations (in milliseconds) */
export const DEFAULT_TIMEOUT_MS = 30000;

/** Default number of retry attempts for failed operations */
export const DEFAULT_RETRY_COUNT = 3;

/** Default delay between retry attempts (in milliseconds) */
export const DEFAULT_RETRY_DELAY = 1000;

/** Maximum upload file size in megabytes */
export const MAX_UPLOAD_SIZE_MB = 50;

/** Batch size for processing large datasets */
export const BATCH_SIZE = 100;

/** Default upload directory for file uploads */
export const UPLOAD_DIR = './data/uploads/';

/** Default database path */
export const DEFAULT_DB_PATH = './data/testforge.db';

/** Default CORS origin */
export const DEFAULT_CORS_ORIGIN = '*';

/** Default log level */
export const DEFAULT_LOG_LEVEL = 'info';

/** Default maximum tokens for AI provider responses */
export const DEFAULT_MAX_TOKENS = 2048;

/** File upload limit in bytes */
export const FILE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
