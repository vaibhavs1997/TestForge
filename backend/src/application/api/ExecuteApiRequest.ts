import { AxiosError, type AxiosRequestHeaders } from 'axios';
import { secureHttpExecutor, type SecureHttpExecutor } from '../../infrastructure/http/SecureHttpExecutor.js';
import type { TestDataResolutionService } from '../test-data/TestDataResolutionService.js';

export interface ExecuteApiRequestInput {
  requestUrl: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  projectId?: string;
  serviceId?: string;
  operationId?: string;
  useTestData?: boolean;
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
  constructor(
    private readonly httpExecutor: SecureHttpExecutor = secureHttpExecutor,
    private readonly testDataResolutionService?: TestDataResolutionService,
  ) {}

  private async applyTestData(input: ExecuteApiRequestInput, headers: Record<string, string>, body: unknown): Promise<{ requestUrl: string; headers: Record<string, string>; body: unknown; sensitiveHeaders: string[]; sensitiveBodyPaths: string[]; sensitiveValues: string[] }> {
    if (!input.useTestData || !input.projectId || !input.operationId || !this.testDataResolutionService) return { requestUrl: input.requestUrl, headers, body, sensitiveHeaders: [], sensitiveBodyPaths: [], sensitiveValues: [] };
    const resolved = await this.testDataResolutionService.resolveRequestFields(input.projectId, input.serviceId || '', input.operationId, {
      runtimeVariables: {}, environmentVariables: {}, sequentialPositions: new Map(), fieldDataCache: new Map(),
    });
    let nextBody = body;
    let nextUrl = input.requestUrl;
    const nextHeaders = { ...headers };
    const sensitiveHeaders: string[] = [];
    const sensitiveBodyPaths: string[] = [];
    const sensitiveValues: string[] = [];
    const setPath = (target: any, path: string, value: unknown): void => {
      const parts = path.split('.').filter(Boolean); if (!parts.length) return;
      const visit = (cursor: any, index: number): void => {
        if (!cursor) return;
        const part = parts[index]; const isArray = part.endsWith('[]'); const name = isArray ? part.slice(0, -2) : part;
        const last = index === parts.length - 1;
        if (isArray) {
          const items = Array.isArray(cursor[name]) ? cursor[name] : [];
          if (last) { if (value === undefined) delete cursor[name]; else cursor[name] = value; }
          else items.forEach((item: any) => visit(item, index + 1));
          return;
        }
        if (last) { if (value === undefined) delete cursor[name]; else cursor[name] = value; return; }
        if (!cursor[name] || typeof cursor[name] !== 'object') cursor[name] = {};
        visit(cursor[name], index + 1);
      };
      visit(target, 0);
    };
    for (const [field, result] of Object.entries(resolved)) {
      const rule = result as { value: unknown; location?: string; path?: string; sensitive?: boolean };
      const location = String(rule.location || 'BODY').toUpperCase();
      const path = rule.path || field;
      if (rule.sensitive && rule.value !== undefined && rule.value !== null) sensitiveValues.push(String(rule.value));
      if (location === 'BODY') {
        if (nextBody && typeof nextBody === 'object' && !Array.isArray(nextBody)) { const copy = structuredClone(nextBody as Record<string, unknown>); setPath(copy, path, rule.value); nextBody = copy; }
        if (rule.sensitive) sensitiveBodyPaths.push(path);
      } else if (location === 'HEADER' || location === 'COOKIE') {
        const key = path.toLowerCase(); const existing = Object.keys(nextHeaders).find((candidate) => candidate.toLowerCase() === key);
        if (location === 'COOKIE') { const cookies = (nextHeaders.Cookie || nextHeaders.cookie || '').split(';').map((part) => part.trim()).filter(Boolean).filter((part) => !part.toLowerCase().startsWith(`${key}=`)); if (rule.value !== undefined) cookies.push(`${path}=${String(rule.value)}`); nextHeaders.Cookie = cookies.join('; '); }
        else if (rule.value === undefined) { if (existing) delete nextHeaders[existing]; } else nextHeaders[existing || path] = String(rule.value);
        if (rule.sensitive) sensitiveHeaders.push(existing || path);
      } else {
        const url = new URL(nextUrl);
        if (location === 'QUERY') {
          if (rule.value === undefined) url.searchParams.delete(path); else url.searchParams.set(path, String(rule.value));
        } else if (rule.value !== undefined) {
          url.pathname = decodeURIComponent(url.pathname).replace(`{${path}}`, encodeURIComponent(String(rule.value)));
        }
        nextUrl = url.toString();
      }
    }
    return { requestUrl: nextUrl, headers: nextHeaders, body: nextBody, sensitiveHeaders, sensitiveBodyPaths, sensitiveValues };
  }

  async execute(input: ExecuteApiRequestInput): Promise<ExecuteApiRequestResult> {
    const requestedAt = new Date().toISOString();
    const startedAt = Date.now();
    const requestHeaders = normalizeHeaders(input.headers);
    const method = String(input.method || 'GET').toUpperCase();
    const resolvedInput = await this.applyTestData(input, requestHeaders, input.body);
    const effectiveHeaders = resolvedInput.headers;
    const responseHeaders = Object.fromEntries(Object.entries(effectiveHeaders).map(([key, value]) => [key, resolvedInput.sensitiveHeaders.some((name) => name.toLowerCase() === key.toLowerCase()) ? '[REDACTED]' : value]));
    const contentType = normalizeContentType(getHeaderValue(effectiveHeaders, 'Content-Type'));
    const preparedBody = prepareRequestBody(resolvedInput.body, contentType);
    const safeBody = (): unknown => {
      if (!resolvedInput.sensitiveBodyPaths.length || !resolvedInput.body || typeof resolvedInput.body !== 'object') return preparedBody.body ?? null;
      const copy = structuredClone(resolvedInput.body as Record<string, unknown>);
      const mask = (cursor: any, parts: string[], index = 0): void => {
        if (!cursor) return;
        const raw = parts[index]; const isArray = raw.endsWith('[]'); const name = raw.replace(/\[\]$/, '');
        if (isArray) { (Array.isArray(cursor[name]) ? cursor[name] : []).forEach((item: any) => mask(item, parts, index + 1)); return; }
        if (index === parts.length - 1) { cursor[name] = '[REDACTED]'; return; }
        mask(cursor[name], parts, index + 1);
      };
      for (const path of resolvedInput.sensitiveBodyPaths) mask(copy, path.split('.').filter(Boolean));
      return copy;
    };
    const redactSensitive = (value: unknown): unknown => {
      if (!resolvedInput.sensitiveValues.length) return value;
      const redactText = (text: string) => resolvedInput.sensitiveValues.reduce((next, secret) => secret ? next.split(secret).join('[REDACTED]') : next, text);
      if (typeof value === 'string') return redactText(value);
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) return value.map(redactSensitive);
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, redactSensitive(item)]));
      }
      return value;
    };

    if (
      input.body !== undefined
      && input.body !== null
      && !getHeaderValue(effectiveHeaders, 'Content-Type')
      && (isPlainObject(resolvedInput.body) || Array.isArray(resolvedInput.body))
    ) {
      effectiveHeaders['Content-Type'] = 'application/json';
    }
    if (!effectiveHeaders.Accept) {
      effectiveHeaders.Accept = 'application/json, text/plain, */*';
    }

    const transportHeaders = { ...effectiveHeaders };
    for (const key of Object.keys(preparedBody.headers)) {
      if (preparedBody.headers[key] === '') {
        delete transportHeaders[key];
      } else {
        transportHeaders[key] = preparedBody.headers[key];
      }
    }

    try {
      const response = await this.httpExecutor.execute({
        method,
        url: resolvedInput.requestUrl,
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
          url: resolvedInput.requestUrl,
          headers: responseHeaders,
          body: safeBody(),
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: redactSensitive(toPlainHeaders(response.headers)) as Record<string, string>,
          body: redactSensitive(tryParseBody(rawBody, contentType)),
          rawBody: redactSensitive(rawBody) as string,
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
          url: resolvedInput.requestUrl,
          headers: responseHeaders,
          body: safeBody(),
        },
        error: {
          message: axiosError.message || 'Failed to execute request',
          code: (error as { errorCode?: string }).errorCode ?? axiosError.code,
          details: axiosError.response
            ? {
                status: axiosError.response.status,
                statusText: axiosError.response.statusText,
                headers: redactSensitive(toPlainHeaders(axiosError.response.headers)) as Record<string, string>,
                body: redactSensitive(axiosError.response.data ?? null),
              }
            : undefined,
        },
      };
    }
  }
}

export default ExecuteApiRequest;
