import axios, { AxiosError, type AxiosRequestHeaders } from 'axios';
import { assertSafeOutboundUrl } from '../../infrastructure/security/outboundUrl.js';

export interface ExecuteApiRequestInput {
  requestUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface ExecuteApiRequestResult {
  ok: boolean;
  requestedAt: string;
  durationMs: number;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: unknown;
    rawBody: string;
    contentType?: string;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

function normalizeHeaders(headers?: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const trimmedKey = key.trim();
    if (!trimmedKey) continue;
    normalized[trimmedKey] = String(value);
  }
  return normalized;
}

function getHeaderValue(headers: Record<string, string>, name: string): string | undefined {
  const lowerName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return undefined;
}

function normalizeContentType(contentType: string | undefined): string {
  return String(contentType || '').split(';')[0].trim().toLowerCase();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof FormData) && !(value instanceof URLSearchParams);
}

function appendFormEntries(target: FormData | URLSearchParams, value: unknown, prefix = ''): void {
  const append = (key: string, entry: string | Blob): void => {
    if (target instanceof URLSearchParams) {
      target.append(key, typeof entry === 'string' ? entry : String(entry));
      return;
    }
    target.append(key, entry);
  };

  if (value === null || value === undefined) {
    if (prefix) append(prefix, '');
    return;
  }

  if (value instanceof Blob) {
    if (prefix) append(prefix, value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}[${index}]` : String(index);
      appendFormEntries(target, item, nextPrefix);
    });
    return;
  }

  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const nextPrefix = prefix ? `${prefix}[${key}]` : key;
      appendFormEntries(target, entry, nextPrefix);
    }
    return;
  }

  if (prefix) append(prefix, String(value));
}

function prepareRequestBody(
  body: unknown,
  contentType: string,
): {
  body: unknown;
  headers: Record<string, string>;
} {
  if (body === undefined || body === null) {
    return { body, headers: {} };
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    if (typeof body === 'string') {
      return { body, headers: {} };
    }
    const params = new URLSearchParams();
    appendFormEntries(params, body);
    return { body: params.toString(), headers: {} };
  }

  if (contentType.includes('multipart/form-data')) {
    if (body instanceof FormData) {
      return { body, headers: {} };
    }
    const formData = new FormData();
    appendFormEntries(formData, body);
    return {
      body: formData,
      headers: {
        'Content-Type': '',
      },
    };
  }

  if (contentType.includes('application/json')) {
    if (typeof body === 'string' || body instanceof Uint8Array || body instanceof ArrayBuffer) {
      return { body, headers: {} };
    }
    if (isPlainObject(body) || Array.isArray(body)) {
      return { body: JSON.stringify(body), headers: {} };
    }
    return { body, headers: {} };
  }

  return { body, headers: {} };
}

function toPlainHeaders(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== 'object') return {};
  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}

function tryParseBody(rawBody: string, contentType?: string): unknown {
  const trimmed = rawBody.trim();
  if (!trimmed) return '';
  if (contentType?.includes('application/json')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return rawBody;
    }
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return rawBody;
  }
}

export class ExecuteApiRequest {
  async execute(input: ExecuteApiRequestInput): Promise<ExecuteApiRequestResult> {
    await assertSafeOutboundUrl(input.requestUrl);
    const requestedAt = new Date().toISOString();
    const startedAt = Date.now();
    const requestHeaders = normalizeHeaders(input.headers);
    const method = String(input.method || 'GET').toUpperCase();
    const contentType = normalizeContentType(getHeaderValue(requestHeaders, 'Content-Type'));
    const preparedBody = prepareRequestBody(input.body, contentType);

    if (
      input.body !== undefined
      && input.body !== null
      && !getHeaderValue(requestHeaders, 'Content-Type')
      && (isPlainObject(input.body) || Array.isArray(input.body))
    ) {
      requestHeaders['Content-Type'] = 'application/json';
    }
    if (!requestHeaders.Accept) {
      requestHeaders.Accept = 'application/json, text/plain, */*';
    }

    const transportHeaders = { ...requestHeaders };
    for (const key of Object.keys(preparedBody.headers)) {
      if (preparedBody.headers[key] === '') {
        delete transportHeaders[key];
      } else {
        transportHeaders[key] = preparedBody.headers[key];
      }
    }

    try {
      const response = await axios.request({
        method,
        url: input.requestUrl,
        maxRedirects: 0,
        headers: transportHeaders as AxiosRequestHeaders,
        data: preparedBody.body,
        timeout: input.timeoutMs || 30000,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: (value) => value,
      });

      const rawBody = typeof response.data === 'string' ? response.data : String(response.data ?? '');
      const contentType = typeof response.headers?.['content-type'] === 'string'
        ? response.headers['content-type']
        : undefined;

      return {
        ok: response.status < 400,
        requestedAt,
        durationMs: Date.now() - startedAt,
        request: {
          method,
          url: input.requestUrl,
          headers: requestHeaders,
          body: preparedBody.body ?? null,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: toPlainHeaders(response.headers),
          body: tryParseBody(rawBody, contentType),
          rawBody,
          contentType,
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        ok: false,
        requestedAt,
        durationMs: Date.now() - startedAt,
        request: {
          method,
          url: input.requestUrl,
          headers: requestHeaders,
          body: preparedBody.body ?? null,
        },
        error: {
          message: axiosError.message || 'Failed to execute request',
          code: axiosError.code,
          details: axiosError.response
            ? {
                status: axiosError.response.status,
                statusText: axiosError.response.statusText,
                headers: toPlainHeaders(axiosError.response.headers),
                body: axiosError.response.data ?? null,
              }
            : undefined,
        },
      };
    }
  }
}

export default ExecuteApiRequest;
