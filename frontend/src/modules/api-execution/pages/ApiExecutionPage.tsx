import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { projectStore } from '../../../store/projectStore';
import { useEnvironments } from '../../environment/hooks/useEnvironments';
import { useServices } from '../../api/hooks';
import { useApiOperations } from '../../api/hooks';
import { environmentService } from '../../environment/services/environmentService';
import { EnvironmentDialog, type EnvironmentDialogData } from '../../environment/components/EnvironmentDialog';
import { ImportEnvironmentModal, type ImportEnvironmentModalData } from '../../environment/components/ImportEnvironmentModal';
import { parseEnvironmentImport, resolveEnvironmentBaseUrl } from '../../environment/utils/parseEnvironmentImport';
import type { EnvironmentDto } from '../../../types/apiModels';
import { load as loadYaml } from 'js-yaml';
import {
  UploadCloud,
  Plus,
  Save,
  Send,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Globe,
  Database,
  ClipboardList,
  Play,
  BookOpen,
  Activity,
  Layers3,
  Shield,
  X,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  Settings2,
  Clock3,
  FileJson,
  FileText,
  CheckCircle2,
  ArrowRight,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { JsonViewer } from '../../../components/shared/JsonViewer';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { datasetService } from '../../test-data/services/datasetService';
import { rowService } from '../../test-data/services/rowService';
import type { DatasetDto } from '../../../types/moduleContracts';
import { apiService } from '../../api/services/apiService';
import { apiAxios } from '../../../services/apiAxios';
import { queryKeys } from '../../../constants';
import { clearLegacyApiWorkspaceState } from '../../../utils/sensitiveBrowserState';
import { runSandboxedScript, SCRIPT_SANDBOX_VERSION, type ScriptMutation } from '../utils/scriptSandbox';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type BodyMode = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';
type RawBodyType = 'json' | 'text' | 'xml' | 'html' | 'javascript';
type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2';
type ResponseTab = 'response' | 'headers' | 'cookies' | 'timeline';
type ResponseBodyView = 'pretty' | 'raw' | 'preview';
type BottomTab = 'related' | 'tests' | 'environments' | 'mock' | 'documentation' | 'activity';
type ImportedKind = 'api' | 'env' | 'unknown';
type SelectionKind = 'api-endpoint' | 'manual' | 'saved' | null;
export type CanonicalOverrideLocation = 'BODY' | 'QUERY' | 'PATH' | 'HEADER' | 'COOKIE' | 'GRAPHQL_VARIABLE';

interface CanonicalTemporaryOverride {
  operationId: string;
  location: CanonicalOverrideLocation;
  path: string;
  value: string;
}

interface KeyValueRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
}

interface HeaderRow {
  id: string;
  name: string;
  value: string;
}

interface EnvLine {
  kind: 'blank' | 'comment' | 'pair';
  raw: string;
  key?: string;
  value?: string;
}

interface AuthDraft {
  type: AuthType;
  bearerToken: string;
  username: string;
  password: string;
  keyName: string;
  keyLocation: 'header' | 'query' | 'cookie';
  keyValue: string;
  oauth2Token: string;
  oauth2Scopes: string;
}

interface RequestSettings {
  timeoutMs: number;
  followRedirects: boolean;
  withCredentials: boolean;
}

interface RequestDraft {
  name: string;
  method: HttpMethod;
  url: string;
  pathParams: KeyValueRow[];
  queryParams: KeyValueRow[];
  headers: HeaderRow[];
  auth: AuthDraft;
  bodyMode: BodyMode;
  rawBodyType: RawBodyType;
  rawBody: string;
  formDataRows: KeyValueRow[];
  urlEncodedRows: KeyValueRow[];
  binaryFile: File | null;
  graphqlQuery: string;
  graphqlVariables: string;
  preRequestScript: string;
  testScript: string;
  settings: RequestSettings;
}

type RuntimeDataStrategy = 'none' | 'unique-email' | 'uuid' | 'timestamp' | 'random-number' | 'dataset' | 'environment' | 'response';

interface RuntimeDataMapping {
  field: string;
  strategy: RuntimeDataStrategy;
  source?: string;
  datasetId?: string;
  column?: string;
}

type RuntimeDataCache = Record<string, RuntimeDataMapping[]>;

interface PersistedRequestDraft extends Omit<RequestDraft, 'binaryFile'> {
  binaryFile: null;
}

interface ImportedApiEndpoint {
  id: string;
  backendOperationId?: string;
  backendServiceId?: string;
  groupId: string;
  groupName: string;
  name: string;
  method: HttpMethod;
  path: string;
  url: string;
  description: string;
  requestTemplate: RequestDraft;
  raw: Record<string, unknown>;
}

interface ImportedApiCollection {
  id: string;
  kind: 'api';
  name: string;
  sourceFormat: string;
  rawText: string;
  parsed: unknown;
  lineCount: number;
  summary: string;
  endpoints: ImportedApiEndpoint[];
}

interface ImportedEnvironment {
  id: string;
  kind: 'env';
  name: string;
  sourceFormat: string;
  rawText: string;
  lineCount: number;
  summary: string;
  entries: EnvLine[];
  variables: Record<string, string>;
}

interface ImportedUnknown {
  id: string;
  kind: 'unknown';
  name: string;
  sourceFormat: string;
  rawText: string;
  lineCount: number;
  summary: string;
  parsed: unknown;
}

type ImportedArtifact = ImportedApiCollection | ImportedEnvironment | ImportedUnknown;

interface ManualRequestRecord {
  id: string;
  draft: PersistedRequestDraft;
  backendServiceId?: string;
  backendOperationId?: string;
  createdAt: number;
  updatedAt: number;
}

interface SavedRequestRecord {
  id: string;
  draft: PersistedRequestDraft;
  createdAt: number;
  updatedAt: number;
}

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

interface ResponseState {
  status: number | null;
  statusText: string;
  durationMs: number | null;
  sizeBytes: number | null;
  headers: Array<[string, string]>;
  body: string;
  isJson: boolean;
  cookies: string[];
  tests: TestResult[];
  startedAt: number | null;
  finishedAt: number | null;
  requestUrl: string;
  requestMethod: string;
}

interface HistoryRecord {
  id: string;
  requestName: string;
  method: HttpMethod;
  url: string;
  status: number | null;
  durationMs: number | null;
  sizeBytes: number | null;
  createdAt: number;
}

interface SelectionState {
  kind: SelectionKind;
  id: string;
  collectionId?: string;
  endpointId?: string;
}

function responseCacheKey(selection: SelectionState | null): string | null {
  if (!selection || !selection.kind) return null;
  return selection.kind === 'api-endpoint'
    ? `${selection.kind}:${selection.collectionId || ''}:${selection.endpointId || selection.id}`
    : `${selection.kind}:${selection.id}`;
}

function comparableApiPath(value: string | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw, 'http://testforge.local').pathname
      .split('/')
      .filter((segment) => !/^\{\{[^}]+\}\}$/.test(segment))
      .join('/')
      .replace(/\/$/, '') || '/';
  } catch {
    return raw.split('?')[0].replace(/\/$/, '') || '/';
  }
}

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const HTTP_METHOD_TEXT_CLASSES: Record<HttpMethod, string> = {
  GET: 'text-primary',
  POST: 'text-success',
  PUT: 'text-warning',
  PATCH: 'text-warning',
  DELETE: 'text-error',
  HEAD: 'text-primary',
  OPTIONS: 'text-text-secondary',
};

function httpMethodTextClass(method: string): string {
  return HTTP_METHOD_TEXT_CLASSES[method as HttpMethod] ?? 'text-text';
}

const BODY_MODES: Array<{ value: BodyMode; label: string }> = [
  { value: 'none', label: 'none' },
  { value: 'form-data', label: 'form-data' },
  { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'raw', label: 'raw' },
  { value: 'binary', label: 'binary' },
  { value: 'graphql', label: 'GraphQL' },
];
const RAW_BODY_TYPES: Array<{ value: RawBodyType; label: string; contentType: string }> = [
  { value: 'json', label: 'JSON', contentType: 'application/json' },
  { value: 'text', label: 'Text', contentType: 'text/plain; charset=utf-8' },
  { value: 'xml', label: 'XML', contentType: 'application/xml' },
  { value: 'html', label: 'HTML', contentType: 'text/html; charset=utf-8' },
  { value: 'javascript', label: 'JavaScript', contentType: 'text/javascript; charset=utf-8' },
];
const AUTH_TYPES: Array<{ value: AuthType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer' },
  { value: 'basic', label: 'Basic' },
  { value: 'apiKey', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
];
const RESPONSE_VIEW_MODES: Array<{ value: ResponseBodyView; label: string }> = [
  { value: 'pretty', label: 'Pretty' },
  { value: 'raw', label: 'Raw' },
  { value: 'preview', label: 'Preview' },
];
const RESPONSE_TABS: Array<{ value: ResponseTab; label: string }> = [
  { value: 'response', label: 'Response' },
  { value: 'headers', label: 'Headers' },
  { value: 'cookies', label: 'Cookies' },
  { value: 'timeline', label: 'Timeline' },
];
const BOTTOM_TABS: Array<{ value: BottomTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'related', label: 'Related', icon: Layers3 },
  { value: 'tests', label: 'Tests', icon: CheckCircle2 },
  { value: 'environments', label: 'Environments', icon: Globe },
  { value: 'mock', label: 'Mock Servers', icon: FileJson },
  { value: 'documentation', label: 'Documentation', icon: BookOpen },
  { value: 'activity', label: 'Activity', icon: Activity },
];

function makeId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isHydratedForProject(hydratedProjectId: string | null, projectId: string): boolean {
  return hydratedProjectId === projectId;
}

function createIdRow(name = '', value = '', description = ''): KeyValueRow {
  return { id: makeId('row'), enabled: true, key: name, value, description };
}

function createHeaderRow(name = '', value = ''): HeaderRow {
  return { id: makeId('hdr'), name, value };
}

function createDefaultAuth(): AuthDraft {
  return {
    type: 'none',
    bearerToken: '',
    username: '',
    password: '',
    keyName: 'X-API-Key',
    keyLocation: 'header',
    keyValue: '',
    oauth2Token: '',
    oauth2Scopes: '',
  };
}

function createDefaultSettings(): RequestSettings {
  return {
    timeoutMs: 30000,
    followRedirects: true,
    withCredentials: false,
  };
}

function createDraft(): RequestDraft {
  return {
    name: 'New Request',
    method: 'GET',
    url: 'https://',
    pathParams: [],
    queryParams: [],
    headers: [createHeaderRow('Accept', 'application/json')],
    auth: createDefaultAuth(),
    bodyMode: 'none',
    rawBodyType: 'json',
    rawBody: '{\n  "name": "TestForge"\n}',
    formDataRows: [createIdRow()],
    urlEncodedRows: [createIdRow()],
    binaryFile: null,
    graphqlQuery: 'query Example {\n  __typename\n}',
    graphqlVariables: '{\n  "example": true\n}',
    preRequestScript: '',
    testScript: '',
    settings: createDefaultSettings(),
  };
}

function emptyResponseState(): ResponseState {
  return {
    status: null,
    statusText: '',
    durationMs: null,
    sizeBytes: null,
    headers: [],
    body: '',
    isJson: false,
    cookies: [],
    tests: [],
    startedAt: null,
    finishedAt: null,
    requestUrl: '',
    requestMethod: '',
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseCanonicalTemporaryOverride(key: string, value: string): CanonicalTemporaryOverride | null {
  const [operationId, rawLocation, ...pathParts] = key.split('|');
  const location = rawLocation as CanonicalOverrideLocation;
  const path = pathParts.join('|').trim();
  if (!operationId || !path || !['BODY', 'QUERY', 'PATH', 'HEADER', 'COOKIE', 'GRAPHQL_VARIABLE'].includes(location)) return null;
  return { operationId, location, path, value };
}

function setNestedOverride(target: Record<string, unknown>, path: string, value: string): void {
  const segments = path.match(/[^.[\]]+/g)?.filter(Boolean) ?? [];
  if (segments.length === 0) return;
  let cursor: Record<string, unknown> | unknown[] = target;
  segments.forEach((segment, index) => {
    const last = index === segments.length - 1;
    const nextIsIndex = /^\d+$/.test(segments[index + 1] || '');
    if (Array.isArray(cursor)) {
      const arrayIndex = Number(segment);
      if (!Number.isInteger(arrayIndex) || arrayIndex < 0) return;
      if (last) { cursor[arrayIndex] = value; return; }
      const existing = cursor[arrayIndex];
      if (!existing || typeof existing !== 'object') cursor[arrayIndex] = nextIsIndex ? [] : {};
      cursor = cursor[arrayIndex] as Record<string, unknown> | unknown[];
      return;
    }
    if (last) { cursor[segment] = value; return; }
    const existing = cursor[segment];
    if (!existing || typeof existing !== 'object') cursor[segment] = nextIsIndex ? [] : {};
    cursor = cursor[segment] as Record<string, unknown> | unknown[];
  });
}

function setRowOverride(rows: KeyValueRow[], key: string, value: string): KeyValueRow[] {
  const index = rows.findIndex((row) => row.key === key);
  if (index < 0) return [...rows, createIdRow(key, value)];
  return rows.map((row, rowIndex) => rowIndex === index ? { ...row, enabled: true, value } : row);
}

function setHeaderOverride(rows: HeaderRow[], name: string, value: string): HeaderRow[] {
  const index = rows.findIndex((row) => row.name.toLowerCase() === name.toLowerCase());
  if (index < 0) return [...rows, createHeaderRow(name, value)];
  return rows.map((row, rowIndex) => rowIndex === index ? { ...row, name, value } : row);
}

function setCookieOverride(rows: HeaderRow[], name: string, value: string): HeaderRow[] {
  const cookieIndex = rows.findIndex((row) => row.name.toLowerCase() === 'cookie');
  const existing = cookieIndex < 0 ? [] : rows[cookieIndex].value.split(';').map((part) => part.trim()).filter(Boolean);
  const cookieEntries = new Map(existing.map((part) => {
    const separator = part.indexOf('=');
    return [separator < 0 ? part : part.slice(0, separator).trim(), separator < 0 ? '' : part.slice(separator + 1)];
  }));
  cookieEntries.set(name, value);
  return setHeaderOverride(rows, 'Cookie', Array.from(cookieEntries, ([key, item]) => `${key}=${item}`).join('; '));
}

/**
 * Applies preview overrides to a cloned request draft.  The key includes the
 * canonical location and path, so `id` in a query cannot overwrite `id` in a
 * header or body. Overrides are deliberately not written to rules or storage.
 */
export function applyCanonicalTemporaryOverrides(draft: RequestDraft, overrides: Record<string, string>): RequestDraft {
  const next = cloneJson(draft);
  Object.entries(overrides).forEach(([key, value]) => {
    const override = parseCanonicalTemporaryOverride(key, value);
    if (!override) return;
    if (override.location === 'QUERY') next.queryParams = setRowOverride(next.queryParams, override.path, override.value);
    if (override.location === 'PATH') next.pathParams = setRowOverride(next.pathParams, override.path, override.value);
    if (override.location === 'HEADER') next.headers = setHeaderOverride(next.headers, override.path, override.value);
    if (override.location === 'COOKIE') next.headers = setCookieOverride(next.headers, override.path, override.value);
    if (override.location === 'BODY') {
      const rawBody = parseJsonSafely(next.rawBody);
      if (rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody)) {
        setNestedOverride(rawBody as Record<string, unknown>, override.path, override.value);
        next.rawBody = stringifyJson(rawBody);
      }
      next.formDataRows = setRowOverride(next.formDataRows, override.path, override.value);
      next.urlEncodedRows = setRowOverride(next.urlEncodedRows, override.path, override.value);
    }
    if (override.location === 'GRAPHQL_VARIABLE') {
      const variables = parseJsonSafely(next.graphqlVariables);
      const target = variables && typeof variables === 'object' && !Array.isArray(variables) ? variables as Record<string, unknown> : {};
      setNestedOverride(target, override.path, override.value);
      next.graphqlVariables = stringifyJson(target);
    }
  });
  return next;
}

function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

function parseJsonSafely(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function normalizeContentType(contentType: string | undefined): string {
  return String(contentType || '').split(';')[0].trim().toLowerCase();
}

function replaceTemplateVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    return variables[key] ?? '';
  });
}

function normalizeBearerToken(value: string): string {
  return value.trim().replace(/^Bearer\s+/i, '').trim().replace(/^['"]|['"]$/g, '');
}

function extractPathParams(url: string): string[] {
  const matches = [
    ...(url.match(/\{([^}]+)\}/g) ?? []),
    ...(url.match(/:([A-Za-z_][A-Za-z0-9_]*)/g) ?? []),
  ];
  return Array.from(
    new Set(
      matches
        .map((match) => match.replace(/[{}:]/g, '').trim())
        .filter(Boolean),
    ),
  );
}

function appendQueryString(url: string, params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  if (entries.length === 0) return url;

  try {
    const resolved = new URL(url, window.location.origin);
    entries.forEach(([key, value]) => resolved.searchParams.set(key, String(value)));
    return resolved.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')}`;
  }
}

function applyPathParameters(url: string, params: Record<string, string>): string {
  return url
    .replace(/\{([^}]+)\}/g, (match, key: string) => {
      const value = params[key];
      return value ? encodeURIComponent(value) : match;
    })
    .replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (match, key: string) => {
      const value = params[key];
      return value ? encodeURIComponent(value) : match;
    });
}

export function resolveUrl(url: string, pathParams: Record<string, string>, queryParams: Record<string, string>, env: Record<string, string>): string {
  const withEnv = replaceTemplateVariables(url, env);
  const withPath = applyPathParameters(withEnv, pathParams);
  return appendQueryString(withPath, queryParams);
}

export function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const key = row.key.trim();
    if (!row.enabled || !key) return acc;
    acc[key] = row.value;
    return acc;
  }, {});
}

function runtimeDataKey(selection: SelectionState | null): string | null {
  return responseCacheKey(selection);
}

function detectRuntimeFields(draft: RequestDraft): string[] {
  const keys = [
    ...draft.pathParams.map((row) => row.key),
    ...draft.queryParams.map((row) => row.key),
    ...draft.formDataRows.map((row) => row.key),
    ...draft.urlEncodedRows.map((row) => row.key),
  ];
  const raw = parseJsonSafely(draft.rawBody);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) keys.push(...Object.keys(raw as Record<string, unknown>));
  return Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean))).filter((key) =>
    /email|e-mail|username|user_name|phone|mobile|uuid|id|timestamp|date|number/i.test(key),
  );
}

function isExistingIdentityEndpoint(draft: RequestDraft): boolean {
  const context = `${draft.name} ${draft.url}`.toLowerCase();
  return /(^|[^a-z])(login|log-in|signin|sign-in|authenticate|auth|token|session|password\/reset|forgot-password)([^a-z]|$)/.test(context);
}

function defaultRuntimeStrategy(field: string, draft?: RequestDraft): RuntimeDataStrategy {
  if (/email|e-mail/i.test(field)) return draft && isExistingIdentityEndpoint(draft) ? 'none' : 'unique-email';
  if (/uuid/i.test(field)) return 'uuid';
  if (/timestamp|created.?at|updated.?at/i.test(field)) return 'timestamp';
  if (/count|number|amount|price|age|quantity|size|total/i.test(field)) return 'random-number';
  return 'none';
}

function runtimeStrategyOptions(field: string, draft?: RequestDraft): Array<{ value: RuntimeDataStrategy; label: string }> {
  const normalized = field.toLowerCase();
  const shared = [
    { value: 'dataset' as const, label: 'Test Data dataset' },
    { value: 'response' as const, label: 'Previous response field' },
    { value: 'none' as const, label: 'Use request value' },
  ];
  if (/email|e-mail/.test(normalized)) return [
    ...(draft && isExistingIdentityEndpoint(draft) ? [] : [{ value: 'unique-email' as const, label: 'Unique email' }]),
    ...shared,
  ];
  if (/timestamp|epoch|created.?at|updated.?at|time/.test(normalized)) return [
    { value: 'timestamp', label: 'Unix timestamp (number)' },
    ...shared,
  ];
  if (/uuid|guid/.test(normalized)) return [
    { value: 'uuid', label: 'UUID' },
    ...shared,
  ];
  if (/count|number|amount|price|age|quantity|size|total/.test(normalized)) return [
    { value: 'random-number', label: 'Random number' },
    ...shared,
  ];
  return [
    ...shared,
    { value: 'unique-email', label: 'Unique email' },
    { value: 'uuid', label: 'UUID' },
    { value: 'timestamp', label: 'Unix timestamp (number)' },
    { value: 'random-number', label: 'Random number' },
  ];
}

function generateRuntimeValue(strategy: RuntimeDataStrategy): string {
  const now = Date.now();
  if (strategy === 'unique-email') return `test+${now}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  if (strategy === 'uuid') return crypto.randomUUID?.() || `${now}-${Math.random().toString(36).slice(2)}`;
  if (strategy === 'timestamp') return String(now);
  if (strategy === 'random-number') return String(Math.floor(100000 + Math.random() * 900000));
  return '';
}

function applyRuntimeData(draft: RequestDraft, mappings: RuntimeDataMapping[], environment: Record<string, string>, resolvedValues: Record<string, string> = {}) {
  const runtimeValues = { ...environment };
  const activeMappings = mappings.filter((mapping) => mapping.strategy !== 'none' && mapping.field.trim());
  activeMappings.forEach((mapping) => {
    const value = mapping.strategy === 'dataset'
      ? resolvedValues[mapping.field] || ''
      : mapping.strategy === 'environment'
      ? environment[mapping.source || mapping.field] || ''
      : mapping.strategy === 'response'
        ? environment[mapping.source || mapping.field] || ''
        : generateRuntimeValue(mapping.strategy);
    runtimeValues[mapping.field] = value;
  });

  const replaceRows = (rows: KeyValueRow[]) => rows.map((row) => {
    const mapping = activeMappings.find((item) => item.field.toLowerCase() === row.key.trim().toLowerCase());
    return mapping ? { ...row, value: runtimeValues[mapping.field] || row.value } : { ...row, value: replaceTemplateVariables(row.value, runtimeValues) };
  });
  draft.pathParams = replaceRows(draft.pathParams);
  draft.queryParams = replaceRows(draft.queryParams);
  draft.formDataRows = replaceRows(draft.formDataRows);
  draft.urlEncodedRows = replaceRows(draft.urlEncodedRows);
  draft.headers = draft.headers.map((row) => ({ ...row, value: replaceTemplateVariables(row.value, runtimeValues) }));
  draft.auth = {
    ...draft.auth,
    bearerToken: replaceTemplateVariables(draft.auth.bearerToken, runtimeValues),
    oauth2Token: replaceTemplateVariables(draft.auth.oauth2Token, runtimeValues),
    keyValue: replaceTemplateVariables(draft.auth.keyValue, runtimeValues),
  };
  draft.url = replaceTemplateVariables(draft.url, runtimeValues);
  const rawBody = parseJsonSafely(draft.rawBody);
  if (rawBody && typeof rawBody === 'object') {
    const replaceObjectFields = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(replaceObjectFields);
      if (!value || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        const mapping = activeMappings.find((candidate) => candidate.field.toLowerCase() === key.toLowerCase());
        return [key, mapping ? runtimeValues[mapping.field] || item : replaceObjectFields(item)];
      }));
    };
    draft.rawBody = JSON.stringify(replaceObjectFields(rawBody), null, 2);
  } else {
    draft.rawBody = replaceTemplateVariables(draft.rawBody, runtimeValues);
  }
  draft.graphqlQuery = replaceTemplateVariables(draft.graphqlQuery, runtimeValues);
  draft.graphqlVariables = replaceTemplateVariables(draft.graphqlVariables, runtimeValues);
  return runtimeValues;
}

export function requestHeadersToRecord(rows: HeaderRow[]): Record<string, string> {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const key = row.name.trim();
    if (!key) return acc;
    acc[key] = row.value;
    return acc;
  }, {});
}

function parseTokenExpiry(value: string): number {
  const normalized = value.trim();
  if (!normalized) return 0;
  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 100000000000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sanitizeDraftForStorage(draft: RequestDraft): PersistedRequestDraft {
  return {
    ...cloneJson(draft),
    binaryFile: null,
  };
}

function payloadFromDraft(draft: RequestDraft): Record<string, unknown> | null {
  if (draft.bodyMode === 'none' || draft.bodyMode === 'binary') return null;
  if (draft.bodyMode === 'form-data') return rowsToRecord(draft.formDataRows);
  if (draft.bodyMode === 'x-www-form-urlencoded') return rowsToRecord(draft.urlEncodedRows);
  if (draft.bodyMode === 'graphql') {
    const variables = parseJsonSafely(draft.graphqlVariables.trim());
    return { query: draft.graphqlQuery, variables: variables && typeof variables === 'object' ? variables : {} };
  }
  const parsed = parseJsonSafely(draft.rawBody.trim());
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
}

function applyScriptMutations(draft: RequestDraft, mutations: ScriptMutation[]): void {
  const setRow = (rows: KeyValueRow[], key: string, value: string) => {
    const existing = rows.find((row) => row.key.trim().toLowerCase() === key.toLowerCase());
    if (existing) existing.value = value;
    else rows.push(createIdRow(key, value));
  };
  mutations.forEach((mutation) => {
    if (mutation.type === 'setUrl') draft.url = mutation.value;
    if (mutation.type === 'setHeader') {
      const name = mutation.name.trim();
      if (!name) return;
      const existing = draft.headers.find((row) => row.name.trim().toLowerCase() === name.toLowerCase());
      if (existing) existing.value = mutation.value;
      else draft.headers.push(createHeaderRow(name, mutation.value));
    }
    if (mutation.type === 'setQueryParam' && mutation.name.trim()) setRow(draft.queryParams, mutation.name.trim(), mutation.value);
    if (mutation.type === 'setPathParam' && mutation.name.trim()) setRow(draft.pathParams, mutation.name.trim(), mutation.value);
    if (mutation.type === 'setBody') draft.rawBody = mutation.value;
    if (mutation.type === 'setAuthType' && ['none', 'bearer', 'basic', 'api-key', 'oauth2'].includes(mutation.value)) draft.auth.type = mutation.value as AuthType;
  });
}

function parseEnvFile(text: string): { entries: EnvLine[]; variables: Record<string, string> } {
  const entries: EnvLine[] = [];
  const variables: Record<string, string> = {};

  splitLines(text).forEach((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      entries.push({ kind: 'blank', raw });
      return;
    }
    if (trimmed.startsWith('#')) {
      entries.push({ kind: 'comment', raw, value: trimmed.slice(1).trim() });
      return;
    }

    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const idx = normalized.indexOf('=');
    if (idx === -1) {
      entries.push({ kind: 'comment', raw, value: trimmed });
      return;
    }

    const key = normalized.slice(0, idx).trim();
    const value = normalized.slice(idx + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (key) {
      variables[key] = value;
      entries.push({ kind: 'pair', raw, key, value });
    } else {
      entries.push({ kind: 'comment', raw, value: trimmed });
    }
  });

  return { entries, variables };
}

function environmentDtoToArtifact(environment: EnvironmentDto): ImportedEnvironment {
  const variables = Object.fromEntries(Object.entries(environment.variables || {}).map(([key, value]) => [
    key,
    value && typeof value === 'object' ? '' : String(value ?? ''),
  ]));
  const entries: EnvLine[] = Object.entries(variables).map(([key, value]) => ({
    kind: 'pair',
    raw: `${key}=${value}`,
    key,
    value,
  }));
  return {
    id: environment.id,
    kind: 'env',
    name: environment.name,
    sourceFormat: 'managed-environment',
    rawText: entries.map((entry) => entry.raw).join('\n'),
    lineCount: entries.length,
    summary: `${Object.keys(variables).length} variables managed by Environment page`,
    entries,
    variables,
  };
}

function looksLikeEnvFile(file: File, text: string): boolean {
  const name = file.name.toLowerCase();
  if (name.includes('.env')) return true;
  const lines = splitLines(text).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return false;
  const envish = lines.filter((line) => /^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line.trim())).length;
  return envish >= Math.max(1, Math.floor(lines.length / 2));
}

function parseEnvironmentArtifact(file: File, text: string, parsed: unknown): ImportedEnvironment | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  const values = Array.isArray(record.values)
    ? record.values
    : Array.isArray(record.variables)
      ? record.variables
      : null;
  if (!values) return null;

  const variables: Record<string, string> = {};
  const entries: EnvLine[] = [];
  values.forEach((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const variable = item as Record<string, unknown>;
    const key = String(variable.key || variable.name || '').trim();
    if (!key) return;
    const value = String(variable.currentValue ?? variable.value ?? variable.initialValue ?? '');
    if (variable.enabled !== false) variables[key] = value;
    entries.push({ kind: 'pair', raw: `${key}=${value}`, key, value });
  });
  if (entries.length === 0) return null;

  const name = String(record.name || file.name);
  return {
    id: makeId('env'),
    kind: 'env',
    name,
    sourceFormat: 'postman-environment',
    rawText: text,
    lineCount: splitLines(text).length,
    summary: `${Object.keys(variables).length} variable${Object.keys(variables).length === 1 ? '' : 's'} imported`,
    entries,
    variables,
  };
}

function detectSourceFormat(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.yaml') || name.endsWith('.yml')) return 'yaml';
  if (name.endsWith('.env') || name.includes('.env.')) return 'env';
  if (name.endsWith('.har')) return 'har';
  return 'text';
}

function parseStructuredText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // continue to yaml
    }
  }
  try {
    return loadYaml(trimmed);
  } catch {
    return text;
  }
}

function deepMerge<T extends Record<string, unknown>>(base: T, addition: T): T {
  const out = cloneJson(base);
  Object.entries(addition).forEach(([key, value]) => {
    if (value === undefined) return;
    if (Array.isArray(value) || typeof value !== 'object' || value === null) {
      (out as Record<string, unknown>)[key] = value;
      return;
    }
    const existing = (out as Record<string, unknown>)[key];
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      (out as Record<string, unknown>)[key] = deepMerge(existing as Record<string, unknown>, value as Record<string, unknown>);
      return;
    }
    (out as Record<string, unknown>)[key] = value;
  });
  return out;
}

function sampleFromSchema(schema: Record<string, unknown> | null | undefined, propertyName?: string): unknown {
  if (!schema) return propertyName ? `${propertyName}-value` : 'string';
  if (schema.example !== undefined) return cloneJson(schema.example);
  if (schema.default !== undefined) return cloneJson(schema.default);
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return cloneJson(schema.enum[0]);

  const type = Array.isArray(schema.type) ? schema.type.find((item) => item !== 'null') : schema.type;
  if (type === 'object' || schema.properties) {
    const properties = (schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties))
      ? schema.properties as Record<string, unknown>
      : {};
    return Object.fromEntries(
      Object.entries(properties).map(([key, value]) => [key, sampleFromSchema(value as Record<string, unknown>, key)]),
    );
  }
  if (type === 'array') {
    return [sampleFromSchema((schema.items && typeof schema.items === 'object' && !Array.isArray(schema.items)) ? schema.items as Record<string, unknown> : undefined, propertyName)];
  }
  if (type === 'integer' || type === 'number') return 0;
  if (type === 'boolean') return true;
  if (type === 'null') return null;
  return propertyName ? `${propertyName}-value` : 'string';
}

function createRowsFromObject(value: unknown): KeyValueRow[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [createIdRow()];
  const rows = Object.entries(value as Record<string, unknown>).map(([key, entry]) =>
    createIdRow(key, typeof entry === 'string' ? entry : stringifyJson(entry), ''),
  );
  return rows.length > 0 ? rows : [createIdRow()];
}

function buildAuthFromOpenApi(operation: Record<string, unknown>, spec: Record<string, unknown>): AuthDraft {
  const auth = createDefaultAuth();
  const security = Array.isArray(operation.security) ? operation.security : Array.isArray(spec.security) ? spec.security : [];
  const firstRequirement = security.find((item) => item && typeof item === 'object' && !Array.isArray(item)) as Record<string, unknown> | undefined;
  if (!firstRequirement) return auth;
  const schemeName = Object.keys(firstRequirement)[0];
  const components = spec.components && typeof spec.components === 'object' && !Array.isArray(spec.components)
    ? spec.components as Record<string, unknown>
    : {};
  const schemes = components.securitySchemes && typeof components.securitySchemes === 'object' && !Array.isArray(components.securitySchemes)
    ? components.securitySchemes as Record<string, Record<string, unknown>>
    : {};
  const scheme = schemes[schemeName];
  if (!scheme) return auth;

  const type = String(scheme.type || '').toLowerCase();
  if (type === 'http' && String(scheme.scheme || '').toLowerCase() === 'bearer') {
    return { ...auth, type: 'bearer' };
  }
  if (type === 'http' && String(scheme.scheme || '').toLowerCase() === 'basic') {
    return { ...auth, type: 'basic' };
  }
  if (type === 'apikey') {
    return {
      ...auth,
      type: 'apiKey',
      keyName: String(scheme.name || schemeName || 'X-API-Key'),
      keyLocation: (String(scheme.in || 'header').toLowerCase() as 'header' | 'query' | 'cookie'),
    };
  }
  if (type === 'oauth2') {
    return { ...auth, type: 'oauth2' };
  }
  return auth;
}

function buildRequestTemplateFromMedia(contentType: string, media: Record<string, unknown>): Partial<RequestDraft> {
  const normalized = normalizeContentType(contentType);
  const schema = media.schema && typeof media.schema === 'object' && !Array.isArray(media.schema)
    ? media.schema as Record<string, unknown>
    : undefined;
  const sample = media.example !== undefined
    ? media.example
    : sampleFromSchema(schema);

  if (normalized.includes('application/x-www-form-urlencoded')) {
    return {
      bodyMode: 'x-www-form-urlencoded',
      urlEncodedRows: createRowsFromObject(sample),
    };
  }
  if (normalized.includes('multipart/form-data')) {
    return {
      bodyMode: 'form-data',
      formDataRows: createRowsFromObject(sample),
    };
  }
  if (normalized.includes('application/json') || normalized.includes('application/ld+json')) {
    return {
      bodyMode: 'raw',
      rawBodyType: 'json',
      rawBody: stringifyJson(sample),
    };
  }
  if (normalized.includes('text/') || normalized.includes('application/xml') || normalized.includes('application/javascript')) {
    return {
      bodyMode: 'raw',
      rawBodyType: normalized.includes('xml') ? 'xml' : normalized.includes('html') ? 'html' : normalized.includes('javascript') ? 'javascript' : 'text',
      rawBody: typeof sample === 'string' ? sample : stringifyJson(sample),
    };
  }
  return {
    bodyMode: 'raw',
    rawBodyType: 'json',
    rawBody: typeof sample === 'string' ? sample : stringifyJson(sample),
  };
}

function buildEndpointDraft(params: {
  method: HttpMethod;
  url: string;
  name: string;
  description?: string;
  headers?: HeaderRow[];
  pathParams?: KeyValueRow[];
  queryParams?: KeyValueRow[];
  auth?: AuthDraft;
  requestBody?: Partial<RequestDraft>;
}): RequestDraft {
  return {
    ...createDraft(),
    name: params.name,
    method: params.method,
    url: params.url,
    headers: params.headers ?? [createHeaderRow('Accept', 'application/json')],
    pathParams: params.pathParams ?? [],
    queryParams: params.queryParams ?? [],
    auth: params.auth ?? createDefaultAuth(),
    ...params.requestBody,
  };
}

function flattenPostmanItems(items: unknown[], groupStack: string[], output: ImportedApiEndpoint[], baseId: string): void {
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const entry = item as Record<string, unknown>;
    if (Array.isArray(entry.item)) {
      const nextGroup = [...groupStack, String(entry.name || `Group ${index + 1}`)];
      flattenPostmanItems(entry.item, nextGroup, output, baseId);
      return;
    }

    const request = entry.request && typeof entry.request === 'object' && !Array.isArray(entry.request)
      ? entry.request as Record<string, unknown>
      : {};
    const method = String(request.method || 'GET').toUpperCase() as HttpMethod;
    const rawUrl = typeof request.url === 'string'
      ? request.url
      : request.url && typeof request.url === 'object' && !Array.isArray(request.url) && typeof (request.url as Record<string, unknown>).raw === 'string'
        ? String((request.url as Record<string, unknown>).raw)
        : '';
    const endpointName = String(entry.name || request.name || `${method} ${rawUrl || '/'}`);
    const groupName = groupStack.length > 0 ? groupStack.join(' / ') : 'Manual';
    const pathParams = extractPathParams(rawUrl).map((name) => createIdRow(name, '', 'Path parameter'));
    const queryParams = rawUrl.includes('?')
      ? rawUrl
          .split('?')[1]
          .split('&')
          .filter(Boolean)
          .map((pair) => {
            const [key, value = ''] = pair.split('=');
            return createIdRow(decodeURIComponent(key), decodeURIComponent(value), 'Query parameter');
          })
      : [];
    const headers = Array.isArray(request.header)
      ? request.header
          .map((header) => header && typeof header === 'object' && !Array.isArray(header) ? header as Record<string, unknown> : null)
          .filter((header): header is Record<string, unknown> => !!header)
          .map((header) => createHeaderRow(String(header.key || ''), String(header.value || '')))
      : [createHeaderRow('Accept', 'application/json')];

    const draft = createDraft();
    draft.name = endpointName;
    draft.method = method;
    draft.url = rawUrl || '/';
    draft.pathParams = pathParams;
    draft.queryParams = queryParams;
    draft.headers = headers.length > 0 ? headers : [createHeaderRow('Accept', 'application/json')];

    const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
      ? request.body as Record<string, unknown>
      : {};
    const bodyMode = String(body.mode || '').toLowerCase();
    if (bodyMode === 'graphql' && body.graphql && typeof body.graphql === 'object' && !Array.isArray(body.graphql)) {
      const gql = body.graphql as Record<string, unknown>;
      draft.bodyMode = 'graphql';
      draft.graphqlQuery = String(gql.query || '');
      draft.graphqlVariables = stringifyJson(gql.variables ?? {});
    } else if (bodyMode === 'urlencoded' && Array.isArray(body.urlencoded)) {
      draft.bodyMode = 'x-www-form-urlencoded';
      draft.urlEncodedRows = body.urlencoded
        .map((row) => row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null)
        .filter((row): row is Record<string, unknown> => !!row)
        .map((row) => createIdRow(String(row.key || ''), String(row.value || ''), String(row.description || '')));
    } else if (bodyMode === 'formdata' && Array.isArray(body.formdata)) {
      draft.bodyMode = 'form-data';
      draft.formDataRows = body.formdata
        .map((row) => row && typeof row === 'object' && !Array.isArray(row) ? row as Record<string, unknown> : null)
        .filter((row): row is Record<string, unknown> => !!row)
        .map((row) => createIdRow(String(row.key || ''), String(row.value || ''), String(row.description || '')));
    } else if (bodyMode === 'raw' && typeof body.raw === 'string') {
      draft.bodyMode = 'raw';
      draft.rawBody = String(body.raw);
    }

    output.push({
      id: `${baseId}-${output.length + 1}`,
      groupId: groupStack.join(' / ') || 'root',
      groupName,
      name: endpointName,
      method,
      path: rawUrl || '/',
      url: rawUrl || '/',
      description: String(entry.description || ''),
      requestTemplate: draft,
      raw: entry,
    });
  });
}

function groupEndpointsByFolder(endpoints: ImportedApiEndpoint[], collectionName: string): Array<[string, ImportedApiEndpoint[]]> {
  const groups = new Map<string, ImportedApiEndpoint[]>();
  endpoints.forEach((endpoint) => {
    const parts = endpoint.groupName
      .split('/')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts[0]?.toLowerCase() === collectionName.trim().toLowerCase()) parts.shift();
    const folder = parts.join(' / ') || 'Root';
    groups.set(folder, [...(groups.get(folder) ?? []), endpoint]);
  });
  return Array.from(groups.entries());
}

function parseApiArtifact(file: File, text: string, parsed: unknown): ImportedApiCollection | ImportedUnknown {
  const baseId = makeId('api');
  const title = file.name.replace(/\.(json|ya?ml|txt|har)$/i, '');
  const isObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
  if (!isObject) {
    return {
      id: baseId,
      kind: 'unknown',
      name: title,
      sourceFormat: detectSourceFormat(file),
      rawText: text,
      lineCount: splitLines(text).length,
      summary: 'Stored as raw text',
      parsed,
    };
  }

  const spec = parsed as Record<string, unknown>;
  if (spec.openapi || spec.swagger || spec.paths) {
    const specTitle = spec.info && typeof spec.info === 'object' && !Array.isArray(spec.info)
      ? String((spec.info as Record<string, unknown>).title || title)
      : title;
    const serverUrl = Array.isArray(spec.servers) && spec.servers.length > 0
      && spec.servers[0] && typeof spec.servers[0] === 'object' && !Array.isArray(spec.servers[0])
      && typeof (spec.servers[0] as Record<string, unknown>).url === 'string'
      ? String((spec.servers[0] as Record<string, unknown>).url)
      : '';
    const endpoints: ImportedApiEndpoint[] = [];
    const paths = spec.paths && typeof spec.paths === 'object' && !Array.isArray(spec.paths)
      ? spec.paths as Record<string, unknown>
      : {};

    Object.entries(paths).forEach(([path, pathItemRaw]) => {
      const pathItem = pathItemRaw && typeof pathItemRaw === 'object' && !Array.isArray(pathItemRaw)
        ? pathItemRaw as Record<string, unknown>
        : {};
      const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];
      ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].forEach((methodKey) => {
        const operation = pathItem[methodKey];
        if (!operation || typeof operation !== 'object' || Array.isArray(operation)) return;
        const op = operation as Record<string, unknown>;
        const method = methodKey.toUpperCase() as HttpMethod;
        const summary = String(op.summary || op.operationId || `${method} ${path}`);
        const groupName = Array.isArray(op.tags) && op.tags.length > 0 ? String(op.tags[0]) : specTitle;
        const allParameters = [...pathParameters, ...(Array.isArray(op.parameters) ? op.parameters : [])];
        const pathParams = allParameters
          .filter((param) => param && typeof param === 'object' && !Array.isArray(param) && String((param as Record<string, unknown>).in || '').toLowerCase() === 'path')
          .map((param) => {
            const record = param as Record<string, unknown>;
            const schema = record.schema && typeof record.schema === 'object' && !Array.isArray(record.schema)
              ? record.schema as Record<string, unknown>
              : undefined;
            const defaultValue = schema?.example ?? schema?.default ?? '';
            return createIdRow(String(record.name || ''), String(defaultValue || ''), String(record.description || ''));
          });
        const queryParams = allParameters
          .filter((param) => param && typeof param === 'object' && !Array.isArray(param) && String((param as Record<string, unknown>).in || '').toLowerCase() === 'query')
          .map((param) => {
            const record = param as Record<string, unknown>;
            const schema = record.schema && typeof record.schema === 'object' && !Array.isArray(record.schema)
              ? record.schema as Record<string, unknown>
              : undefined;
            const defaultValue = schema?.example ?? schema?.default ?? '';
            return createIdRow(String(record.name || ''), String(defaultValue || ''), String(record.description || ''));
          });
        const headers = allParameters
          .filter((param) => param && typeof param === 'object' && !Array.isArray(param) && String((param as Record<string, unknown>).in || '').toLowerCase() === 'header')
          .map((param) => {
            const record = param as Record<string, unknown>;
            const schema = record.schema && typeof record.schema === 'object' && !Array.isArray(record.schema)
              ? record.schema as Record<string, unknown>
              : undefined;
            const defaultValue = schema?.example ?? schema?.default ?? '';
            return createHeaderRow(String(record.name || ''), String(defaultValue || ''));
          });
        const requestBody = op.requestBody && typeof op.requestBody === 'object' && !Array.isArray(op.requestBody)
          ? op.requestBody as Record<string, unknown>
          : undefined;
        let requestBodyPatch: Partial<RequestDraft> = {};
        if (requestBody && requestBody.content && typeof requestBody.content === 'object' && !Array.isArray(requestBody.content)) {
          const content = requestBody.content as Record<string, Record<string, unknown>>;
          const contentType = Object.keys(content).find((item) => item.toLowerCase().includes('application/x-www-form-urlencoded'))
            || Object.keys(content).find((item) => item.toLowerCase().includes('multipart/form-data'))
            || Object.keys(content).find((item) => item.toLowerCase().includes('application/json'))
            || Object.keys(content)[0];
          if (contentType) {
            requestBodyPatch = buildRequestTemplateFromMedia(contentType, content[contentType]);
          }
        }

        const auth = buildAuthFromOpenApi(op, spec);
        const baseUrl = serverUrl ? `${serverUrl.replace(/\/$/, '')}${path}` : path;
        const draft = buildEndpointDraft({
          method,
          url: baseUrl,
          name: summary,
          description: String(op.description || ''),
          headers: headers.length > 0 ? headers : [createHeaderRow('Accept', 'application/json')],
          pathParams,
          queryParams,
          auth,
          requestBody: requestBodyPatch,
        });

        endpoints.push({
          id: `${baseId}-${endpoints.length + 1}`,
          groupId: groupName,
          groupName,
          name: summary,
          method,
          path,
          url: baseUrl,
          description: String(op.description || ''),
          requestTemplate: draft,
          raw: op,
        });
      });
    });

    return {
      id: baseId,
      kind: 'api',
      name: specTitle,
      sourceFormat: String(spec.openapi ? 'openapi' : 'swagger'),
      rawText: text,
      parsed,
      lineCount: splitLines(text).length,
      summary: `${endpoints.length} endpoint${endpoints.length === 1 ? '' : 's'} parsed`,
      endpoints,
    };
  }

  if (Array.isArray(spec.item)) {
    const endpoints: ImportedApiEndpoint[] = [];
    flattenPostmanItems(spec.item, [String(spec.info && typeof spec.info === 'object' && !Array.isArray(spec.info) ? (spec.info as Record<string, unknown>).name || title : title)], endpoints, baseId);
    return {
      id: baseId,
      kind: 'api',
      name: String(spec.info && typeof spec.info === 'object' && !Array.isArray(spec.info) ? (spec.info as Record<string, unknown>).name || title : title),
      sourceFormat: 'postman',
      rawText: text,
      parsed,
      lineCount: splitLines(text).length,
      summary: `${endpoints.length} request${endpoints.length === 1 ? '' : 's'} parsed`,
      endpoints,
    };
  }

  return {
    id: baseId,
    kind: 'unknown',
    name: title,
    sourceFormat: detectSourceFormat(file),
    rawText: text,
    lineCount: splitLines(text).length,
    summary: 'Stored as raw text',
    parsed,
  };
}

function parseImportedFile(file: File): Promise<ImportedArtifact> {
  return file.text().then((text) => {
    const sourceFormat = detectSourceFormat(file);
    const parsed = sourceFormat === 'env' ? text : parseStructuredText(text);
    const structuredEnvironment = parseEnvironmentArtifact(file, text, parsed);
    if (structuredEnvironment) return structuredEnvironment;
    if (looksLikeEnvFile(file, text)) {
      const { entries, variables } = parseEnvFile(text);
      return {
        id: makeId('env'),
        kind: 'env',
        name: file.name,
        sourceFormat,
        rawText: text,
        lineCount: splitLines(text).length,
        summary: `${Object.keys(variables).length} variable${Object.keys(variables).length === 1 ? '' : 's'} preserved in original order`,
        entries,
        variables,
      } satisfies ImportedEnvironment;
    }
    return parseApiArtifact(file, text, parsed);
  });
}

function formatResponseBody(text: string): { body: string; isJson: boolean } {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) return { body: '', isJson: false };
  try {
    const parsed = JSON.parse(trimmed);
    // Some gateways return a JSON document encoded as a JSON string for
    // failures (for example: "{\\"statusCode\\":404,...}"). Decode that
    // second layer so the response panel shows the actual error object.
    if (typeof parsed === 'string') {
      const nested = parsed.trim();
      if (nested.startsWith('{') || nested.startsWith('[')) {
        try {
          return { body: JSON.stringify(JSON.parse(nested), null, 2), isJson: true };
        } catch {
          // Keep the decoded string below when it is not valid JSON.
        }
      }
      return { body: parsed, isJson: false };
    }
    return { body: JSON.stringify(parsed, null, 2), isJson: true };
  } catch {
    return { body: text, isJson: false };
  }
}

function toReadableSize(bytes: number | null): string {
  if (!bytes && bytes !== 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function buildBodyFromDraft(draft: RequestDraft): { body: BodyInit | null; headersToRemove: string[] } {
  const headersToRemove: string[] = [];
  if (draft.bodyMode === 'none') return { body: null, headersToRemove };
  if (draft.bodyMode === 'form-data') {
    const formData = new FormData();
    draft.formDataRows.forEach((row) => {
      if (row.enabled && row.key.trim()) formData.append(row.key.trim(), row.value);
    });
    headersToRemove.push('Content-Type');
    return { body: formData, headersToRemove };
  }
  if (draft.bodyMode === 'x-www-form-urlencoded') {
    const params = new URLSearchParams();
    draft.urlEncodedRows.forEach((row) => {
      if (row.enabled && row.key.trim()) params.append(row.key.trim(), row.value);
    });
    return { body: params.toString(), headersToRemove: [] };
  }
  if (draft.bodyMode === 'binary') {
    if (!draft.binaryFile) return { body: null, headersToRemove };
    headersToRemove.push('Content-Type');
    return { body: draft.binaryFile, headersToRemove };
  }
  if (draft.bodyMode === 'graphql') {
    const variables = draft.graphqlVariables.trim() ? (parseJsonSafely(draft.graphqlVariables.trim()) ?? {}) : {};
    return {
      body: JSON.stringify({ query: draft.graphqlQuery, variables }),
      headersToRemove: [],
    };
  }
  const selectedType = RAW_BODY_TYPES.find((item) => item.value === draft.rawBodyType);
  return {
    body: draft.rawBody,
    headersToRemove: selectedType ? [] : [],
  };
}

function getAuthHeadersAndQuery(auth: AuthDraft): { headers: Record<string, string>; query: Record<string, string> } {
  if (auth.type === 'none') return { headers: {}, query: {} };
  if (auth.type === 'bearer') {
    const token = normalizeBearerToken(auth.bearerToken);
    return token ? { headers: { Authorization: `Bearer ${token}` }, query: {} } : { headers: {}, query: {} };
  }
  if (auth.type === 'basic') {
    if (!auth.username && !auth.password) return { headers: {}, query: {} };
    const encoded = btoa(`${auth.username}:${auth.password}`);
    return { headers: { Authorization: `Basic ${encoded}` }, query: {} };
  }
  if (auth.type === 'apiKey') {
    if (!auth.keyValue.trim()) return { headers: {}, query: {} };
    if (auth.keyLocation === 'query') return { headers: {}, query: { [auth.keyName]: auth.keyValue } };
    if (auth.keyLocation === 'cookie') return { headers: { Cookie: `${auth.keyName}=${auth.keyValue}` }, query: {} };
    return { headers: { [auth.keyName]: auth.keyValue }, query: {} };
  }
  if (auth.type === 'oauth2') {
    const token = normalizeBearerToken(auth.oauth2Token);
    return token ? { headers: { Authorization: `Bearer ${token}` }, query: {} } : { headers: {}, query: {} };
  }
  return { headers: {}, query: {} };
}

function getCookieStrings(headers: Array<[string, string]>): string[] {
  const responseCookies = headers
    .filter(([name]) => name.toLowerCase() === 'set-cookie')
    .map(([, value]) => value);
  const browserCookies = typeof document !== 'undefined' && document.cookie
    ? document.cookie.split(';').map((cookie) => cookie.trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...responseCookies, ...browserCookies]));
}

function makeHistoryEntry(draft: RequestDraft, response: ResponseState): HistoryRecord {
  return {
    id: makeId('history'),
    requestName: draft.name,
    method: draft.method,
    url: response.requestUrl || draft.url,
    status: response.status,
    durationMs: response.durationMs,
    sizeBytes: response.sizeBytes,
    createdAt: Date.now(),
  };
}

export const ApiExecutionPage: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);
  const projectId = routeProjectId ?? selectedProjectId ?? '1';
  const queryClient = useQueryClient();
  const { services: sharedApiServices = [] } = useServices(projectId);
  const { operations: sharedApiOperations = [] } = useApiOperations(projectId, sharedApiServices.map((service) => service.id));
  const {
    environments: managedEnvironments = [],
    updateAsync: updateManagedEnvironment,
    removeAsync: removeManagedEnvironment,
  } = useEnvironments(projectId);
  const [searchTerm, setSearchTerm] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const binaryFileInputRef = React.useRef<HTMLInputElement>(null);
  const requestWorkspaceRef = React.useRef<HTMLDivElement>(null);
  const responsePanelRef = React.useRef<HTMLDivElement>(null);
  const saveConfirmationTimerRef = React.useRef<number | null>(null);
  const managedEnvironmentIdsRef = React.useRef<Set<string>>(new Set());
  const syncedApiArtifactIdsRef = React.useRef<Set<string>>(new Set());
  const apiSyncPromisesRef = React.useRef<Set<Promise<unknown>>>(new Set());
  const apiSyncDisabledRef = React.useRef(false);
  const payloadSyncRef = React.useRef<Record<string, string>>({});
  const autoTokenEnvironmentIdRef = React.useRef<string | null>(null);
  const sharedEnvironmentSyncRef = React.useRef('');
  const syncedEnvironmentArtifactIdsRef = React.useRef<Set<string>>(new Set());

  const [importedArtifacts, setImportedArtifacts] = React.useState<ImportedArtifact[]>([]);
  const [manualRequests, setManualRequests] = React.useState<ManualRequestRecord[]>([]);
  const [savedRequests, setSavedRequests] = React.useState<SavedRequestRecord[]>([]);
  const manualRequestsRef = React.useRef<ManualRequestRecord[]>(manualRequests);
  const savedRequestsRef = React.useRef<SavedRequestRecord[]>(savedRequests);
  const [history, setHistory] = React.useState<HistoryRecord[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = React.useState('');
  const [testDataDatasets, setTestDataDatasets] = React.useState<DatasetDto[]>([]);

  const [selection, setSelection] = React.useState<SelectionState | null>(null);
  const [draft, setDraft] = React.useState<RequestDraft>(createDraft);
  const [loading, setLoading] = React.useState(false);
  const [response, setResponse] = React.useState<ResponseState>(emptyResponseState());
  const [responseCache, setResponseCache] = React.useState<Record<string, ResponseState>>({});
  const [draftCache, setDraftCache] = React.useState<Record<string, PersistedRequestDraft>>({});
  const [runtimeData, setRuntimeData] = React.useState<RuntimeDataCache>({});
  const [responseTab, setResponseTab] = React.useState<ResponseTab>('response');
  const [responseBodyView, setResponseBodyView] = React.useState<ResponseBodyView>('pretty');
  const [bottomTab, setBottomTab] = React.useState<BottomTab>('related');
  const [requestTab, setRequestTab] = React.useState<'params' | 'headers' | 'authorization' | 'body' | 'scripts' | 'tests' | 'settings'>('params');
  const [methodMenuOpen, setMethodMenuOpen] = React.useState(false);
  const [environmentMenuOpen, setEnvironmentMenuOpen] = React.useState(false);
  const [expandedCollections, setExpandedCollections] = React.useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({});
  const [activeRequestLog, setActiveRequestLog] = React.useState<string>('Ready to send');
  const [lastScriptOutput, setLastScriptOutput] = React.useState<string[]>([]);
  // Hydration is tied to the route project, not merely to whether this page
  // has hydrated at least once. Without this distinction, a project change
  // briefly leaves the previous project's state marked as hydrated; the
  // persistence and shared-repository sync effects can then copy that state
  // into the newly selected project.
  const [hydratedProjectId, setHydratedProjectId] = React.useState<string | null>(null);
  const lastHydrated = isHydratedForProject(hydratedProjectId, projectId);
  const [explorerHeight, setExplorerHeight] = React.useState<number | null>(null);
  const [tokenNow, setTokenNow] = React.useState(() => Date.now());
  const [saveConfirmation, setSaveConfirmation] = React.useState('');
  const [environmentManagerOpen, setEnvironmentManagerOpen] = React.useState(false);
  const [environmentEditorOpen, setEnvironmentEditorOpen] = React.useState(false);
  const [environmentImportOpen, setEnvironmentImportOpen] = React.useState(false);
  const [environmentEditorTarget, setEnvironmentEditorTarget] = React.useState<EnvironmentDto | undefined>();
  const [environmentDeleteTarget, setEnvironmentDeleteTarget] = React.useState<EnvironmentDto | null>(null);
  const [apiDeleteConfirmOpen, setApiDeleteConfirmOpen] = React.useState(false);
  const [endpointDeleteTarget, setEndpointDeleteTarget] = React.useState<{ collection: ImportedApiCollection; endpoint: ImportedApiEndpoint } | null>(null);
  const [endpointDeleteBusy, setEndpointDeleteBusy] = React.useState(false);
  const [apiImportFiles, setApiImportFiles] = React.useState<File[]>([]);
  const [apiImportBusy, setApiImportBusy] = React.useState(false);
  const [environmentSearch, setEnvironmentSearch] = React.useState('');
  const [environmentActionBusy, setEnvironmentActionBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void datasetService.listDatasets(projectId)
      .then((datasets) => { if (!cancelled) setTestDataDatasets(datasets); })
      .catch(() => { if (!cancelled) setTestDataDatasets([]); });
    return () => { cancelled = true; };
  }, [projectId]);

  React.useEffect(() => () => {
    if (saveConfirmationTimerRef.current !== null) {
      window.clearTimeout(saveConfirmationTimerRef.current);
    }
  }, []);

  React.useEffect(() => {
    const updateExplorerHeight = () => {
      const requestHeight = requestWorkspaceRef.current?.getBoundingClientRect().height ?? 0;
      const responseHeight = responsePanelRef.current?.getBoundingClientRect().height ?? 0;
      if (requestHeight > 0 && responseHeight > 0) {
        setExplorerHeight(requestHeight + responseHeight + 16);
      }
    };

    const observer = new ResizeObserver(updateExplorerHeight);
    if (requestWorkspaceRef.current) observer.observe(requestWorkspaceRef.current);
    if (responsePanelRef.current) observer.observe(responsePanelRef.current);
    updateExplorerHeight();
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    // Prior versions stored complete requests, responses and imported .env
    // files. Remove those snapshots before creating the memory-only workspace.
    clearLegacyApiWorkspaceState();
    setImportedArtifacts([]);
    setManualRequests([]);
    setSavedRequests([]);
    setHistory([]);
    setResponseCache({});
    setDraftCache({});
    setRuntimeData({});
    setSelection(null);
    setDraft(createDraft());
    setActiveEnvironmentId('');
    setHydratedProjectId(projectId);
  }, [projectId]);

  // Migrate collections previously stored only in the API workspace into the
  // shared backend repository used by Requirements and other project pages.
  React.useEffect(() => {
    if (!lastHydrated) return;
    const apiArtifacts = importedArtifacts.filter(
      (artifact): artifact is ImportedApiCollection => artifact.kind === 'api' && Boolean(artifact.rawText?.trim()),
    );
    for (const artifact of apiArtifacts) {
      if (syncedApiArtifactIdsRef.current.has(artifact.id)) continue;
      syncedApiArtifactIdsRef.current.add(artifact.id);
      const extension = artifact.sourceFormat.toLowerCase().includes('yaml') ? 'yaml' : 'json';
      const file = new File([artifact.rawText], `${artifact.name || 'import'}.${extension}`, { type: 'application/json' });
      const syncPromise = apiService.importContract(projectId, file);
      apiSyncPromisesRef.current.add(syncPromise);
      void syncPromise.catch(() => {
        syncedApiArtifactIdsRef.current.delete(artifact.id);
      }).finally(() => {
        apiSyncPromisesRef.current.delete(syncPromise);
      });
    }
  }, [importedArtifacts, lastHydrated, projectId]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    const managed = managedEnvironments.map(environmentDtoToArtifact);
    const managedIds = new Set(managed.map((environment) => environment.id));
    const previousManagedIds = managedEnvironmentIdsRef.current;
    setImportedArtifacts((current) => {
      const nonEnvironments = current.filter((artifact) => artifact.kind !== 'env');
      const localEnvironments = current
        .filter((artifact): artifact is ImportedEnvironment => artifact.kind === 'env')
        .filter((environment) => !previousManagedIds.has(environment.id) || managedIds.has(environment.id));
      const byName = new Map(localEnvironments.map((environment) => [environment.name.toLowerCase(), environment]));
      managed.forEach((environment) => byName.set(environment.name.toLowerCase(), environment));
      return [...nonEnvironments, ...Array.from(byName.values())];
    });
    managedEnvironmentIdsRef.current = managedIds;
  }, [lastHydrated, managedEnvironments]);

  // Older imports may exist only in the API page's local artifact store. Move
  // those environments into the shared backend repository so the manager,
  // Requirements, and Execution all see the same records.
  React.useEffect(() => {
    if (!lastHydrated || managedEnvironments.length > 0 && importedArtifacts.length === 0) return;
    const managedNames = new Set(managedEnvironments.map((environment) => environment.name.trim().toLowerCase()));
    const localOnly = importedArtifacts.filter(
      (artifact): artifact is ImportedEnvironment => artifact.kind === 'env'
        && artifact.sourceFormat !== 'auto'
        && !managedNames.has(artifact.name.trim().toLowerCase())
        && !syncedEnvironmentArtifactIdsRef.current.has(artifact.id),
    );
    if (localOnly.length === 0) return;
    localOnly.forEach((artifact) => syncedEnvironmentArtifactIdsRef.current.add(artifact.id));
    void environmentService.batchUpsertEnvironments(projectId, localOnly.map((artifact) => ({
      name: artifact.name,
      baseUrl: resolveEnvironmentBaseUrl(artifact.variables),
      variables: artifact.variables,
    }))).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) }))
      .catch(() => {
        localOnly.forEach((artifact) => syncedEnvironmentArtifactIdsRef.current.delete(artifact.id));
      });
  }, [importedArtifacts, lastHydrated, managedEnvironments, projectId, queryClient]);

  React.useEffect(() => {
    const clearTransientState = () => {
      setImportedArtifacts([]); setManualRequests([]); setSavedRequests([]); setHistory([]);
      setResponseCache({}); setDraftCache({}); setRuntimeData({}); setSelection(null);
      setDraft(createDraft()); setResponse(emptyResponseState()); setActiveEnvironmentId('');
    };
    window.addEventListener('testforge:clear-sensitive-state', clearTransientState);
    return () => window.removeEventListener('testforge:clear-sensitive-state', clearTransientState);
  }, []);

  React.useEffect(() => {
    if (!lastHydrated) return;
    const key = responseCacheKey(selection);
    setResponse(key ? responseCache[key] ?? emptyResponseState() : emptyResponseState());
  }, [selection, responseCache, lastHydrated]);

  React.useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const apiCollections = React.useMemo(
    () => importedArtifacts.filter((item): item is ImportedApiCollection => item.kind === 'api'),
    [importedArtifacts],
  );
  const environments = React.useMemo(
    () => {
      const candidates = importedArtifacts
        .filter((item): item is ImportedEnvironment => item.kind === 'env')
        .filter((environment) => environment.sourceFormat !== 'auto' && !/\(from \.env\)$/i.test(environment.name));
      const byName = new Map<string, ImportedEnvironment>();
      candidates.forEach((environment) => {
        const key = environment.name.trim().toLowerCase();
        const existing = byName.get(key);
        if (!existing || environment.sourceFormat === 'managed-environment') byName.set(key, environment);
      });
      return Array.from(byName.values());
    },
    [importedArtifacts],
  );
  const unknownImports = React.useMemo(
    () => importedArtifacts.filter((item): item is ImportedUnknown => item.kind === 'unknown'),
    [importedArtifacts],
  );
  const activeEnvironment = React.useMemo(
    () => environments.find((item) => item.id === activeEnvironmentId) ?? null,
    [activeEnvironmentId, environments],
  );
  const selectedEnvironment = activeEnvironment;

  // Persist the API workspace selection as the project's shared default so
  // requirement generation and execution resolve the same environment.
  const selectEnvironment = React.useCallback(async (environmentId: string) => {
    setActiveEnvironmentId(environmentId);
    if (!environmentId) return;
    try {
      await environmentService.updateEnvironment(projectId, environmentId, { isDefault: true });
      await queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) });
    } catch {
      // Keep the local selection usable even if the shared preference request
      // fails (for example while an imported environment is still syncing).
      setActiveRequestLog('Environment selected locally; shared environment sync will retry on save.');
    }
  }, [projectId, queryClient]);

  // Also sync a selection restored from the API page's project-local storage
  // (for example after a reload), not only fresh dropdown clicks.
  React.useEffect(() => {
    if (!lastHydrated || !activeEnvironmentId || sharedEnvironmentSyncRef.current === activeEnvironmentId) return;
    sharedEnvironmentSyncRef.current = activeEnvironmentId;
    void environmentService.updateEnvironment(projectId, activeEnvironmentId, { isDefault: true })
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) }))
      .catch(() => undefined);
  }, [activeEnvironmentId, lastHydrated, projectId, queryClient]);

  React.useEffect(() => {
    if (activeEnvironmentId && environments.some((environment) => environment.id === activeEnvironmentId)) return;
    if (environments.length > 0) setActiveEnvironmentId(environments[0].id);
    else if (activeEnvironmentId) setActiveEnvironmentId('');
  }, [activeEnvironmentId, environments]);

  const selectedApiEndpoint = React.useMemo(() => {
    if (selection?.kind !== 'api-endpoint') return null;
    for (const collection of apiCollections) {
      const endpoint = collection.endpoints.find((item) => item.id === selection.endpointId);
      if (endpoint) return endpoint;
    }
    return null;
  }, [apiCollections, selection]);

  const visibleApiCollections = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return apiCollections;
    return apiCollections
      .map((collection) => ({
        ...collection,
        endpoints: collection.endpoints.filter((endpoint) =>
          `${collection.name} ${endpoint.name} ${endpoint.path} ${endpoint.method} ${endpoint.description}`.toLowerCase().includes(term),
        ),
      }))
      .filter((collection) => collection.endpoints.length > 0 || collection.name.toLowerCase().includes(term));
  }, [apiCollections, searchTerm]);

  const visibleManualRequests = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return manualRequests;
    return manualRequests.filter((item) => `${item.draft.name} ${item.draft.method} ${item.draft.url}`.toLowerCase().includes(term));
  }, [manualRequests, searchTerm]);

  const visibleSavedRequests = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return savedRequests;
    return savedRequests.filter((item) => `${item.draft.name} ${item.draft.method} ${item.draft.url}`.toLowerCase().includes(term));
  }, [savedRequests, searchTerm]);

  const visibleEnvironments = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return environments;
    return environments.filter((env) => `${env.name} ${Object.entries(env.variables).map(([k, v]) => `${k} ${v}`).join(' ')}`.toLowerCase().includes(term));
  }, [environments, searchTerm]);
  const managedEnvironmentList = React.useMemo(() => {
    const term = environmentSearch.trim().toLowerCase();
    return managedEnvironments.filter((environment) => `${environment.name} ${environment.description || ''}`.toLowerCase().includes(term));
  }, [environmentSearch, managedEnvironments]);

  const explorerCounts = React.useMemo(() => ({
    api: apiCollections.length,
    env: environments.length,
    unknown: unknownImports.length,
    manual: manualRequests.length,
    saved: savedRequests.length,
  }), [apiCollections.length, environments.length, unknownImports.length, manualRequests.length, savedRequests.length]);

  React.useEffect(() => {
    if (!selectedApiEndpoint && selection?.kind !== 'api-endpoint') return;
    if (!selectedApiEndpoint) return;
    if (selection?.kind === 'api-endpoint') {
      const key = responseCacheKey(selection);
      const nextDraft = (key && draftCache[key]) || selectedApiEndpoint.requestTemplate;
      setDraft((current) => {
        if (JSON.stringify(sanitizeDraftForStorage(current)) === JSON.stringify(nextDraft)) return current;
        return cloneJson(nextDraft);
      });
    }
  }, [selectedApiEndpoint, selection, draftCache]);

  // Keep the shared operation in sync with edits made in the API workspace.
  // Requirements and test generation read this persisted sample body.
  React.useEffect(() => {
    if (!lastHydrated || selection?.kind !== 'api-endpoint' || !selectedApiEndpoint) return;
    const payload = payloadFromDraft(draft);
    const signature = JSON.stringify(payload);
    const timer = window.setTimeout(() => {
      void (async () => {
        const services = await apiService.listServices(projectId);
        const groups = await Promise.all(services.map(async (service) => ({
          service,
          operations: await apiService.listOperations(projectId, service.id),
        })));
        const operations = groups.flatMap(({ operations }) => operations.filter((operation) =>
          operation.method.toUpperCase() === draft.method.toUpperCase()
          && (comparableApiPath(operation.path) === comparableApiPath(selectedApiEndpoint.path)
            || operation.name.trim().toLowerCase() === selectedApiEndpoint.name.trim().toLowerCase()),
        ));
        const pending = operations.filter((operation) => {
          const syncKey = `${operation.id}:${signature}`;
          if (payloadSyncRef.current[operation.id] === syncKey) return false;
          payloadSyncRef.current[operation.id] = syncKey;
          return true;
        });
        await Promise.all(pending.map((operation) => apiService.updateOperation(projectId, operation.serviceId, operation.id, { sampleRequestBody: payload })));
        if (pending.length > 0) await queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) });
      })().catch(() => undefined);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [apiCollections, draft, lastHydrated, projectId, queryClient, selectedApiEndpoint, selection, sharedApiOperations]);

  React.useEffect(() => {
    manualRequestsRef.current = manualRequests;
    savedRequestsRef.current = savedRequests;
  }, [manualRequests, savedRequests]);

  // Restore a request when the user changes selection. Do not depend on the
  // request collections here: typing updates the selected manual record and
  // a collection-driven restore would immediately overwrite the in-progress
  // draft, causing the form inputs to flicker/reset.
  React.useEffect(() => {
    if (selection?.kind === 'manual') {
      const record = manualRequestsRef.current.find((item) => item.id === selection.id);
      if (record) {
        setDraft((current) => JSON.stringify(sanitizeDraftForStorage(current)) === JSON.stringify(record.draft)
          ? current
          : cloneJson(record.draft));
      }
    }
    if (selection?.kind === 'saved') {
      const record = savedRequestsRef.current.find((item) => item.id === selection.id);
      if (record) {
        setDraft((current) => JSON.stringify(sanitizeDraftForStorage(current)) === JSON.stringify(record.draft)
          ? current
          : cloneJson(record.draft));
      }
    }
  }, [selection]);

  React.useEffect(() => {
    if (!selection || selection.kind !== 'manual') return;
    const nextDraft = sanitizeDraftForStorage(draft);
    setManualRequests((current) => {
      const record = current.find((item) => item.id === selection.id);
      if (!record || JSON.stringify(record.draft) === JSON.stringify(nextDraft)) return current;
      return current.map((item) => (item.id === selection.id
        ? { ...item, draft: nextDraft, updatedAt: Date.now() }
        : item));
    });
  }, [draft, selection]);

  const setSelectedSelection = (next: SelectionState | null, nextDraft: RequestDraft) => {
    setSelection(next);
    setDraft(nextDraft);
    setActiveRequestLog(`${nextDraft.method} ${nextDraft.url}`);
    setResponse(responseCacheKey(next) ? responseCache[responseCacheKey(next) as string] ?? emptyResponseState() : emptyResponseState());
    setResponseBodyView('pretty');
    setBottomTab('related');
  };

  const selectApiEndpoint = (collection: ImportedApiCollection, endpoint: ImportedApiEndpoint) => {
    const nextSelection = { kind: 'api-endpoint' as const, id: endpoint.id, collectionId: collection.id, endpointId: endpoint.id };
    const cachedDraft = draftCache[responseCacheKey(nextSelection) || ''];
    setExpandedCollections((current) => ({ ...current, [collection.id]: true }));
    setSelectedSelection(nextSelection, cloneJson(cachedDraft || endpoint.requestTemplate));
  };

  const selectManualRequest = (record: ManualRequestRecord) => {
    setSelectedSelection({ kind: 'manual', id: record.id }, cloneJson(record.draft));
  };

  const selectSavedRequest = (record: SavedRequestRecord) => {
    setSelectedSelection({ kind: 'saved', id: record.id }, cloneJson(record.draft));
  };

  const createNewRequest = () => {
    const record: ManualRequestRecord = {
      id: makeId('manual'),
      draft: sanitizeDraftForStorage(createDraft()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setManualRequests((current) => [record, ...current]);
    setSelectedSelection({ kind: 'manual', id: record.id }, createDraft());
  };

  const saveCurrentRequest = async () => {
    const persisted = sanitizeDraftForStorage(draft);
    const now = Date.now();
    const confirmation = `Saved ${draft.name}`;
    if (saveConfirmationTimerRef.current !== null) {
      window.clearTimeout(saveConfirmationTimerRef.current);
    }
    setSaveConfirmation(confirmation);
    saveConfirmationTimerRef.current = window.setTimeout(() => {
      setSaveConfirmation('');
      saveConfirmationTimerRef.current = null;
    }, 3000);

    if (selection?.kind === 'api-endpoint') {
      const key = responseCacheKey(selection);
      if (key) {
        setDraftCache((current) => ({ ...current, [key]: persisted }));
      }
      const selectedCollection = apiCollections.find((collection) => collection.endpoints.some((endpoint) => endpoint.id === selection.endpointId));
      const candidates = sharedApiOperations.filter((operation) =>
        operation.method.toUpperCase() === persisted.method.toUpperCase()
        && comparableApiPath(operation.path) === comparableApiPath(selectedApiEndpoint?.path),
      );
      const serviceOperation = candidates.find((operation) =>
        operation.serviceName?.toLowerCase() === selectedCollection?.name?.toLowerCase(),
      );
      try {
        // Always read the authoritative backend list. The cached operation
        // query can contain the pre-import record or an old duplicate.
        const services = await apiService.listServices(projectId);
        const operationGroups = await Promise.all(services.map(async (service) => ({
          service,
          operations: await apiService.listOperations(projectId, service.id),
        })));
        const authoritative = operationGroups.flatMap(({ service, operations }) => operations
          .filter((operation) => operation.method.toUpperCase() === persisted.method.toUpperCase()
            && (comparableApiPath(operation.path) === comparableApiPath(selectedApiEndpoint?.path)
              || operation.name.trim().toLowerCase() === (selectedApiEndpoint?.name || persisted.name).trim().toLowerCase()))
          .map((operation) => ({ ...operation, serviceName: service.name })));
        const byId = new Map(authoritative.map((operation) => [operation.id, operation]));
        // Keep every matching backend operation in sync. A project can have
        // duplicate records after repeated contract imports; Requirements
        // may map to any of them, so updating only the cached ID can leave a
        // stale import-time payload behind.
        let operationsToSync = Array.from(byId.values());
        if (operationsToSync.length === 0) operationsToSync = serviceOperation ? [serviceOperation] : candidates;
        if (operationsToSync.length === 0) {
          setActiveRequestLog('Saved locally, but no matching backend API operation was found');
          return;
        }
        await Promise.all(operationsToSync.map((operation) => apiService.updateOperation(projectId, operation.serviceId, operation.id, {
          name: persisted.name.trim() || operation.name,
          method: persisted.method,
          path: comparableApiPath(persisted.url),
          authenticationType: persisted.auth.type,
          status: 'active',
          sampleRequestBody: payloadFromDraft(persisted),
        })));
        await queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) });
      } catch {
        setActiveRequestLog('Saved locally, but backend payload sync failed');
        return;
      }
      setActiveRequestLog(confirmation);
      return;
    }

    if (selection?.kind === 'manual') {
      setManualRequests((current) =>
        current.map((item) => (item.id === selection.id ? { ...item, draft: persisted, updatedAt: now } : item)),
      );

      try {
        const manualCollectionId = 'manual-api-collection';
        const path = comparableApiPath(persisted.url);
        const operationName = persisted.name.trim() && persisted.name.trim() !== 'New Request'
          ? persisted.name.trim()
          : `${persisted.method} ${path}`;
        const manualRecord = manualRequestsRef.current.find((item) => item.id === selection.id);
        const services = await apiService.listServices(projectId);
        let service = manualRecord?.backendServiceId
          ? services.find((item) => item.id === manualRecord.backendServiceId)
          : undefined;
        if (!service) {
          service = services.find((item) => item.name.trim().toLowerCase() === 'manual apis');
        }
        if (!service) {
          service = await apiService.createService(projectId, {
            name: 'Manual APIs',
            description: 'Endpoints created manually in the API workspace.',
            version: '1.0.0',
            tags: ['manual'],
          });
        }

        let operation = manualRecord?.backendOperationId
          ? await apiService.getOperation(projectId, service.id, manualRecord.backendOperationId)
          : undefined;
        if (operation) {
          operation = await apiService.updateOperation(projectId, service.id, operation.id, {
            name: operationName,
            method: persisted.method,
            path,
            authenticationType: persisted.auth.type,
            status: 'active',
            sampleRequestBody: payloadFromDraft(persisted),
          });
        } else {
          operation = await apiService.createOperation(projectId, service.id, {
            name: operationName,
            method: persisted.method,
            path,
            authenticationType: persisted.auth.type,
            status: 'active',
          });
          operation = await apiService.updateOperation(projectId, service.id, operation.id, {
            sampleRequestBody: payloadFromDraft(persisted),
          });
        }

        const endpoint: ImportedApiEndpoint = {
          id: operation.id,
          backendOperationId: operation.id,
          backendServiceId: service.id,
          groupId: manualCollectionId,
          groupName: 'Manual APIs',
          name: operationName,
          method: persisted.method,
          path,
          url: persisted.url,
          description: operation.description || 'Manually added endpoint',
          requestTemplate: cloneJson(persisted),
          raw: { source: 'manual' },
        };
        setManualRequests((current) => current.map((item) => item.id === selection.id
          ? { ...item, draft: persisted, backendServiceId: service.id, backendOperationId: operation.id, updatedAt: now }
          : item));
        setImportedArtifacts((current) => {
          const collection = current.find((item): item is ImportedApiCollection => item.kind === 'api' && item.id === manualCollectionId);
          if (collection) {
            return current.map((item) => item.kind === 'api' && item.id === manualCollectionId
              ? { ...item, endpoints: [...item.endpoints.filter((candidate) => candidate.id !== endpoint.id), endpoint] }
              : item);
          }
          return [...current, {
            id: manualCollectionId,
            kind: 'api',
            name: 'Manual APIs',
            sourceFormat: 'manual',
            rawText: '',
            parsed: null,
            lineCount: 0,
            summary: 'Endpoints created manually in the API workspace.',
            endpoints: [endpoint],
          }];
        });
        setExpandedCollections((current) => ({ ...current, [manualCollectionId]: true }));
        setSelectedSelection({ kind: 'api-endpoint', id: endpoint.id, collectionId: manualCollectionId, endpointId: endpoint.id }, cloneJson(persisted));
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.services(projectId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) }),
        ]);
      } catch {
        setActiveRequestLog('Saved locally, but the endpoint could not be added to the API explorer');
        return;
      }
    }
    if (selection?.kind === 'saved') {
      setSavedRequests((current) =>
        current.map((item) => (item.id === selection.id ? { ...item, draft: persisted, updatedAt: now } : item)),
      );
    } else if (!selection) {
      const record: SavedRequestRecord = {
        id: makeId('saved'),
        draft: persisted,
        createdAt: now,
        updatedAt: now,
      };
      setSavedRequests((current) => [record, ...current]);
      setSelection({ kind: 'saved', id: record.id });
    }
    setActiveRequestLog(confirmation);
  };

  const clearImports = () => {
    setImportedArtifacts([]);
    setResponseCache({});
    setDraftCache({});
    setSelection(null);
    setDraft(createDraft());
    setActiveEnvironmentId('');
    setActiveRequestLog('Cleared imports');
    setResponse(emptyResponseState());
  };

  const deleteImportedEndpoint = async () => {
    if (!endpointDeleteTarget) return;
    const { collection, endpoint } = endpointDeleteTarget;
    setEndpointDeleteBusy(true);
    const matchingOperation = sharedApiOperations.find((operation) =>
      operation.serviceName?.toLowerCase() === collection.name.toLowerCase()
      && operation.method.toUpperCase() === endpoint.method.toUpperCase()
      && operation.path === endpoint.path,
    );

    setImportedArtifacts((current) => current
      .map((artifact) => artifact.id !== collection.id || artifact.kind !== 'api'
        ? artifact
        : { ...artifact, endpoints: artifact.endpoints.filter((item) => item.id !== endpoint.id) })
      .filter((artifact) => artifact.kind !== 'api' || artifact.endpoints.length > 0));
    const remainingImports = importedArtifacts
      .map((artifact) => artifact.id !== collection.id || artifact.kind !== 'api'
        ? artifact
        : { ...artifact, endpoints: artifact.endpoints.filter((item) => item.id !== endpoint.id) })
      .filter((artifact) => artifact.kind !== 'api' || artifact.endpoints.length > 0);

    if (selection?.kind === 'api-endpoint' && selection.endpointId === endpoint.id) {
      setSelection(null);
      setDraft(createDraft());
      setResponse(emptyResponseState());
    }
    if (matchingOperation?.id && matchingOperation.serviceId) {
      try {
        await apiService.deleteOperation(projectId, matchingOperation.serviceId, matchingOperation.id);
        await queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) });
        setActiveRequestLog(`Deleted endpoint ${endpoint.name}`);
      } catch {
        setActiveRequestLog(`Removed local endpoint ${endpoint.name}; shared API deletion failed`);
      }
    } else {
      setActiveRequestLog(`Deleted endpoint ${endpoint.name}`);
    }
    setEndpointDeleteBusy(false);
    setEndpointDeleteTarget(null);
  };

  const copyResponse = async () => {
    if (!response.body) return;
    await navigator.clipboard.writeText(response.body);
    setActiveRequestLog('Response copied to clipboard');
  };

  const clearCurrentResponse = () => {
    setResponse(emptyResponseState());
    const key = responseCacheKey(selection);
    if (key) setResponseCache((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setActiveRequestLog('Response cleared');
  };

  const deleteImportedApis = () => {
    if (importedArtifacts.filter((item) => item.kind === 'api').length === 0 && sharedApiServices.length === 0) return;
    setApiDeleteConfirmOpen(false);
    apiSyncDisabledRef.current = true;
    syncedApiArtifactIdsRef.current.clear();

    // Clear the visible workspace first so a slow shared cleanup cannot block
    // navigation or leave the user looking at stale imported APIs.
    setImportedArtifacts((current) => current.filter((item) => item.kind !== 'api'));
    // Remove the local snapshot immediately as well. Otherwise a remount
    // hydrates the deleted contract and the migration effect can recreate it.
    const remainingImports = importedArtifacts.filter((item) => item.kind !== 'api');
    if (selection?.kind === 'api-endpoint') {
      setSelection(null);
      setDraft(createDraft());
      setResponse(emptyResponseState());
    }
    setActiveRequestLog('Deleted imported API contracts');

    // Wait for any local-to-backend migrations already in flight. Otherwise a
    // late import can recreate the contracts immediately after this delete.
    void Promise.allSettled(Array.from(apiSyncPromisesRef.current))
      .then(() => apiService.deleteApiContract(projectId))
      .then(() => Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.services(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) }),
      ]))
      .catch(() => {
        setActiveRequestLog('Deleted local API imports; shared API cleanup could not be confirmed');
      });
  };

  const importApiFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setApiImportBusy(true);
    try {
      const parsedFiles = await Promise.all(
        files.map(async (file) => ({ file, artifact: await parseImportedFile(file) })),
      );
      const collections = parsedFiles
        .map(({ artifact }) => artifact)
        .filter((item): item is ImportedApiCollection => item.kind === 'api');
      const envs = parsedFiles
        .map(({ artifact }) => artifact)
        .filter((item): item is ImportedEnvironment => item.kind === 'env');
      const unknowns = parsedFiles
        .map(({ artifact }) => artifact)
        .filter((item): item is ImportedUnknown => item.kind === 'unknown');
      if (collections.length > 0) apiSyncDisabledRef.current = false;

      let syncedApiCount = 0;
      for (const { file, artifact } of parsedFiles) {
        if (artifact.kind !== 'api') continue;
        try {
          const summary = await apiService.importContract(projectId, file);
          syncedApiCount += (summary.operationsImported ?? 0) + (summary.operationsUpdated ?? 0);
        } catch {
          setActiveRequestLog(`API imported locally but shared synchronization failed for ${file.name}`);
        }
      }

      let syncedEnvironments = envs;
      if (envs.length > 0) {
        try {
          const result = await environmentService.batchUpsertEnvironments(projectId, envs.map((environment) => ({
            name: environment.name,
            baseUrl: resolveEnvironmentBaseUrl(environment.variables),
            variables: environment.variables,
          })));
          syncedEnvironments = result.environments.map(environmentDtoToArtifact);
        } catch {
          setActiveRequestLog('Environment saved locally; shared environment sync failed');
        }
      }
      if (syncedEnvironments.length > 0) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) });
      }
      const allServices = await apiService.listServices(projectId);
      const allOperations = (await Promise.all(allServices.map((service) => apiService.listOperations(projectId, service.id)))).flat();
      const linkedCollections = collections.map((collection) => ({
        ...collection,
        endpoints: collection.endpoints.map((endpoint) => {
          const operation = allOperations.find((candidate) =>
            candidate.method.toUpperCase() === endpoint.method.toUpperCase()
            && (comparableApiPath(candidate.path) === comparableApiPath(endpoint.path)
              || candidate.name.trim().toLowerCase() === endpoint.name.trim().toLowerCase()),
          );
          return operation ? { ...endpoint, backendOperationId: operation.id, backendServiceId: operation.serviceId } : endpoint;
        }),
      }));

      setImportedArtifacts((current) => [...current, ...linkedCollections, ...syncedEnvironments, ...unknowns]);
      if (syncedEnvironments.length > 0 && !activeEnvironmentId) setActiveEnvironmentId(syncedEnvironments[0].id);
      const firstCollection = linkedCollections[0];
      const firstEndpoint = firstCollection?.endpoints[0];
      if (firstEndpoint) {
        setExpandedCollections((current) => ({ ...current, [firstCollection.id]: true }));
        setSelection({ kind: 'api-endpoint', id: firstEndpoint.id, collectionId: firstCollection.id, endpointId: firstEndpoint.id });
        setDraft(cloneJson(firstEndpoint.requestTemplate));
      } else if (envs[0] && !selection) {
        setSelection(null);
        setDraft(createDraft());
      }
      if (syncedApiCount > 0) {
        setActiveRequestLog(`Synchronized ${syncedApiCount} API operation${syncedApiCount === 1 ? '' : 's'} for Requirements`);
      }
      if (collections.length > 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.services(projectId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) });
      }
    } finally {
      setApiImportBusy(false);
      setApiImportFiles([]);
    }
  };

  const captureOAuthToken = (responseState: ResponseState) => {
    if (!responseState.isJson) return;
    const targetEnvironmentId = activeEnvironmentId || environments[0]?.id || autoTokenEnvironmentIdRef.current || makeId('auto-env');
    autoTokenEnvironmentIdRef.current = targetEnvironmentId;
    if (!activeEnvironmentId) setActiveEnvironmentId(targetEnvironmentId);
    const payload = parseJsonSafely(responseState.body);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    const tokenPayload = payload as Record<string, unknown>;
    const nestedPayload = tokenPayload.data && typeof tokenPayload.data === 'object' && !Array.isArray(tokenPayload.data)
      ? tokenPayload.data as Record<string, unknown>
      : {};
    const accessToken = normalizeBearerToken(String(tokenPayload.access_token || tokenPayload.accessToken || nestedPayload.access_token || nestedPayload.accessToken || ''));
    if (!accessToken) return;
    const expiresIn = Number(tokenPayload.expires_in || 0);
    const activeEnvironmentArtifact = importedArtifacts.find((artifact): artifact is ImportedEnvironment => artifact.kind === 'env' && artifact.id === targetEnvironmentId);
    const managedTokenEnvironment = managedEnvironments.find((environment) =>
      environment.id === targetEnvironmentId
      || (activeEnvironmentArtifact && environment.name.trim().toLowerCase() === activeEnvironmentArtifact.name.trim().toLowerCase()),
    );
    const hasSnakeCaseToken = Boolean(activeEnvironmentArtifact && Object.prototype.hasOwnProperty.call(activeEnvironmentArtifact.variables, 'access_token'));
    const tokenKey = hasSnakeCaseToken ? 'access_token' : 'accessToken';
    const syncedVariables: Record<string, string> = {
      ...(activeEnvironmentArtifact?.variables || {}),
      [tokenKey]: accessToken,
      accessToken,
      ...(expiresIn > 0 ? { tokenExpiresAt: String(Date.now() + expiresIn * 1000) } : {}),
    };

    setImportedArtifacts((current) => {
      const hasTarget = current.some((artifact) => artifact.kind === 'env' && artifact.id === targetEnvironmentId);
      const updated = current.map((artifact) => {
        if (artifact.kind !== 'env' || artifact.id !== targetEnvironmentId) return artifact;
        const entries: EnvLine[] = artifact.entries.some((entry) => entry.kind === 'pair' && entry.key === tokenKey)
          ? artifact.entries.map((entry) => entry.kind === 'pair' && (entry.key === tokenKey || entry.key === 'accessToken' || entry.key === 'access_token')
            ? { ...entry, value: accessToken, raw: `${entry.key}=${accessToken}` }
            : entry)
          : [...artifact.entries, { kind: 'pair', key: tokenKey, value: accessToken, raw: `${tokenKey}=${accessToken}` }];
        if (!entries.some((entry) => entry.kind === 'pair' && entry.key === 'accessToken')) entries.push({ kind: 'pair', key: 'accessToken', value: accessToken, raw: `accessToken=${accessToken}` });
        if (!entries.some((entry) => entry.kind === 'pair' && entry.key === 'access_token')) entries.push({ kind: 'pair', key: 'access_token', value: accessToken, raw: `access_token=${accessToken}` });
        return { ...artifact, variables: syncedVariables, entries, summary: `${Object.keys(syncedVariables).length} variables, OAuth token captured` };
      });
      if (hasTarget) return updated;
      const entries: EnvLine[] = [
        { kind: 'pair', key: 'accessToken', value: accessToken, raw: `accessToken=${accessToken}` },
        { kind: 'pair', key: 'access_token', value: accessToken, raw: `access_token=${accessToken}` },
      ];
      return [...updated, { id: targetEnvironmentId, kind: 'env', name: 'Default environment', sourceFormat: 'auto', rawText: '', lineCount: entries.length, summary: 'Environment created automatically', entries, variables: syncedVariables }];
    });
    const persistToken = managedTokenEnvironment
      ? updateManagedEnvironment(managedTokenEnvironment.id, { variables: syncedVariables })
      : environmentService.batchUpsertEnvironments(projectId, [{
        name: activeEnvironmentArtifact?.name || 'Default environment',
        baseUrl: activeEnvironmentArtifact ? resolveEnvironmentBaseUrl(activeEnvironmentArtifact.variables) : '',
        variables: syncedVariables,
      }]);
    void persistToken.then(() => queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) }));
    setActiveRequestLog(`OAuth token captured as ${Object.prototype.hasOwnProperty.call(currentEnvironmentVariables, 'access_token') ? 'access_token' : 'accessToken'}`);
  };

  const captureRuntimeResponse = (responseState: ResponseState, mappings: RuntimeDataMapping[]) => {
    if (!responseState.isJson) return;
    const payload = parseJsonSafely(responseState.body);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    const values = payload as Record<string, unknown>;
    const responseMappings = mappings.filter((mapping) => mapping.strategy === 'response' && mapping.field && mapping.source);
    if (responseMappings.length === 0) return;
    const captured: Record<string, string> = {};
    responseMappings.forEach((mapping) => {
      const value = String(values[mapping.source || ''] ?? '').trim();
      if (value) captured[mapping.field] = value;
    });
    if (Object.keys(captured).length === 0) return;
    if (!activeEnvironmentId) return;
    const activeEnvironmentArtifact = importedArtifacts.find(
      (artifact): artifact is ImportedEnvironment => artifact.kind === 'env' && artifact.id === activeEnvironmentId,
    );
    if (!activeEnvironmentArtifact) return;
    const syncedVariables = { ...activeEnvironmentArtifact.variables, ...captured };
    setImportedArtifacts((current) => current.map((artifact) => (
      artifact.kind === 'env' && artifact.id === activeEnvironmentId
        ? { ...artifact, variables: syncedVariables, summary: `${Object.keys(syncedVariables).length} variables, response values captured` }
        : artifact
    )));
    void updateManagedEnvironment(activeEnvironmentId, { variables: syncedVariables });
    setActiveRequestLog(`Captured ${Object.keys(captured).length} response value${Object.keys(captured).length === 1 ? '' : 's'}`);
  };

  const resolveDatasetValues = async (mappings: RuntimeDataMapping[]) => {
    const values: Record<string, string> = {};
    const datasetMappings = mappings.filter((mapping) => mapping.strategy === 'dataset' && mapping.datasetId && mapping.column);
    const byDataset = new Map<string, RuntimeDataMapping[]>();
    datasetMappings.forEach((mapping) => {
      const current = byDataset.get(mapping.datasetId!) || [];
      byDataset.set(mapping.datasetId!, [...current, mapping]);
    });
    for (const [datasetId, datasetFields] of byDataset) {
      const row = await rowService.reserveRow(projectId, datasetId, `${projectId}:${selection?.id || 'request'}:${Date.now()}`);
      datasetFields.forEach((mapping) => {
        const rawValue = row.values[mapping.column!];
        if (rawValue !== undefined && rawValue !== null) values[mapping.field] = String(rawValue);
      });
    }
    return values;
  };

  const handleEnvironmentSubmit = async (data: EnvironmentDialogData) => {
    setEnvironmentActionBusy(true);
    try {
      const payload = {
        name: data.name,
        baseUrl: data.baseUrl,
        description: data.description,
        authentication: data.authentication,
        variables: data.variables,
        timeout: data.timeout,
      };
      if (data.id) await updateManagedEnvironment(data.id, payload);
      else await environmentService.createEnvironment(projectId, payload);
      setEnvironmentEditorOpen(false);
      setActiveRequestLog(data.id ? `Updated environment ${data.name}` : `Created environment ${data.name}`);
    } finally {
      setEnvironmentActionBusy(false);
    }
  };

  const handleEnvironmentImport = async (data: ImportEnvironmentModalData) => {
    setEnvironmentActionBusy(true);
    try {
      const payloads: Array<{ name: string; baseUrl: string; description?: string; variables?: Record<string, string>; timeout?: number }> = [];
      if (data.source === 'file' && data.files?.length) {
        for (const file of data.files) {
          const parsed = await parseEnvironmentImport({ file, format: data.format });
          parsed.forEach((environment) => payloads.push({
            name: environment.name,
            baseUrl: environment.baseUrl,
            description: environment.description,
            variables: environment.variables,
            timeout: environment.timeout,
          }));
        }
      } else if (data.source === 'url' && data.url) {
        const parsed = await parseEnvironmentImport({ url: data.url, format: data.format });
        parsed.forEach((environment) => payloads.push({
          name: environment.name,
          baseUrl: environment.baseUrl,
          description: environment.description,
          variables: environment.variables,
          timeout: environment.timeout,
        }));
      }
      if (payloads.length === 0) throw new Error('Select an environment file or enter an environment URL.');
      const result = await environmentService.batchUpsertEnvironments(projectId, payloads);
      await queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) });
      setEnvironmentImportOpen(false);
      setActiveRequestLog(`Synchronized ${result.environments.length} environment${result.environments.length === 1 ? '' : 's'}`);
    } finally {
      setEnvironmentActionBusy(false);
    }
  };

  const requestDeleteManagedEnvironment = (environment: EnvironmentDto) => {
    setEnvironmentDeleteTarget(environment);
  };

  const deleteManagedEnvironment = async () => {
    if (!environmentDeleteTarget) return;
    const environment = environmentDeleteTarget;
    setEnvironmentActionBusy(true);
    try {
      await removeManagedEnvironment(environment.id);
      if (activeEnvironmentId === environment.id) setActiveEnvironmentId('');
      setActiveRequestLog(`Deleted environment ${environment.name}`);
      setEnvironmentDeleteTarget(null);
    } finally {
      setEnvironmentActionBusy(false);
    }
  };

  const clearSavedRequests = () => {
    setSavedRequests([]);
    setActiveRequestLog('Cleared saved requests');
  };

  const clearManualRequests = () => {
    setManualRequests([]);
    setActiveRequestLog('Cleared manual requests');
  };

  const removeItem = (kind: 'manual' | 'saved', id: string) => {
    if (kind === 'manual') {
      setManualRequests((current) => current.filter((item) => item.id !== id));
      if (selection?.kind === 'manual' && selection.id === id) {
        setSelection(null);
        setDraft(createDraft());
      }
    } else {
      setSavedRequests((current) => current.filter((item) => item.id !== id));
      if (selection?.kind === 'saved' && selection.id === id) {
        setSelection(null);
        setDraft(createDraft());
      }
    }
  };

  const toggleCollection = (collectionId: string) => {
    setExpandedCollections((current) => ({ ...current, [collectionId]: !current[collectionId] }));
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((current) => ({ ...current, [folderId]: current[folderId] === false }));
  };

  const currentEnvironmentVariables = React.useMemo(() => {
    if (!activeEnvironment) return {};
    return activeEnvironment.variables;
  }, [activeEnvironment]);

  const urlTemplateVariables = Array.from(draft.url.matchAll(/\{\{([^}]+)\}\}/g), (match) => match[1].trim());
  const missingUrlVariables = urlTemplateVariables.filter(
    (name) => !Object.prototype.hasOwnProperty.call(currentEnvironmentVariables, name),
  );
  const hasResolvedUrlVariables = urlTemplateVariables.length > 0 && missingUrlVariables.length === 0;
  const urlVariablePreview = urlTemplateVariables.length > 0
    ? urlTemplateVariables.map((name) => `${name}: ${currentEnvironmentVariables[name] || '(blank)'}`).join('\n')
    : '';
  const environmentToken = currentEnvironmentVariables.accessToken || currentEnvironmentVariables.access_token || '';
  const rawTokenExpiry = currentEnvironmentVariables.tokenExpiresAt || currentEnvironmentVariables.expires_at || currentEnvironmentVariables.expiresAt || '';
  const tokenExpiryMs = parseTokenExpiry(rawTokenExpiry);
  const oauthTokenState = !environmentToken ? 'Missing token' : tokenExpiryMs > 0 && tokenNow >= tokenExpiryMs ? 'Expired' : 'Active';

  const updateEnvironmentToken = (value: string) => {
    const targetEnvironmentId = activeEnvironmentId || environments[0]?.id || autoTokenEnvironmentIdRef.current || makeId('auto-env');
    autoTokenEnvironmentIdRef.current = targetEnvironmentId;
    if (!activeEnvironmentId) setActiveEnvironmentId(targetEnvironmentId);
    const target = importedArtifacts.find((artifact): artifact is ImportedEnvironment => artifact.kind === 'env' && artifact.id === targetEnvironmentId);
    const variables: Record<string, string> = { ...(target?.variables || {}), accessToken: value, access_token: value };
    delete variables.tokenExpiresAt;
    delete variables.expires_at;
    delete variables.expiresAt;
    setImportedArtifacts((current) => {
      const exists = current.some((artifact) => artifact.kind === 'env' && artifact.id === targetEnvironmentId);
      const updated = current.map((artifact) => {
        if (artifact.kind !== 'env' || artifact.id !== targetEnvironmentId) return artifact;
        const entries = artifact.entries.some((entry) => entry.kind === 'pair' && (entry.key === 'accessToken' || entry.key === 'access_token'))
          ? artifact.entries.map((entry) => entry.kind === 'pair' && (entry.key === 'accessToken' || entry.key === 'access_token') ? { ...entry, value, raw: `${entry.key}=${value}` } : entry)
          : [...artifact.entries, { kind: 'pair' as const, key: 'accessToken', value, raw: `accessToken=${value}` }];
        return { ...artifact, variables, entries, summary: `${Object.keys(variables).length} variables` };
      });
      if (exists) return updated;
      return [...updated, { id: targetEnvironmentId, kind: 'env' as const, name: 'Default environment', sourceFormat: 'auto', rawText: '', lineCount: 2, summary: 'Environment saved automatically', entries: [{ kind: 'pair' as const, key: 'accessToken', value, raw: `accessToken=${value}` }, { kind: 'pair' as const, key: 'access_token', value, raw: `access_token=${value}` }], variables }];
    });
    const managedTokenEnvironment = managedEnvironments.find((environment) =>
      environment.id === targetEnvironmentId
      || (target && environment.name.trim().toLowerCase() === target.name.trim().toLowerCase()),
    );
    const persistToken = managedTokenEnvironment
      ? updateManagedEnvironment(managedTokenEnvironment.id, { variables })
      : environmentService.batchUpsertEnvironments(projectId, [{
        name: target?.name || 'Default environment',
        baseUrl: target ? resolveEnvironmentBaseUrl(target.variables) : '',
        variables,
      }]);
    void persistToken.then(() => queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) }));
  };


  React.useEffect(() => {
    setTokenNow(Date.now());
    if (!tokenExpiryMs || tokenExpiryMs <= Date.now()) return undefined;
    const timer = window.setTimeout(() => setTokenNow(Date.now()), tokenExpiryMs - Date.now() + 50);
    return () => window.clearTimeout(timer);
  }, [environmentToken, tokenExpiryMs]);

  React.useEffect(() => {
    if (!selection || selection.kind !== 'api-endpoint') return;
    setDraft((current) => ({ ...current, pathParams: current.pathParams.length > 0 ? current.pathParams : extractPathParams(current.url).map((name) => createIdRow(name)) }));
  }, [selection]);

  React.useEffect(() => {
    setDraft((current) => {
      const placeholders = extractPathParams(current.url);
      if (placeholders.length === 0) return current;
      const existing = new Map(current.pathParams.map((row) => [row.key.trim(), row]));
      const nextRows = placeholders.map((name) => existing.get(name) ?? createIdRow(name));
      const same = nextRows.length === current.pathParams.length && nextRows.every((row, index) => row.key === current.pathParams[index]?.key);
      return same ? current : { ...current, pathParams: nextRows };
    });
  }, [draft.url]);

  const executeRequest = async (temporaryOverrides: Record<string, string> = {}) => {
    setLoading(true);
    setResponse(emptyResponseState());
    setActiveRequestLog(`Sending ${draft.method} ${draft.url}`);

    let workingDraft = cloneJson(draft);
    const environmentVariables = { ...currentEnvironmentVariables };
    const selectedRuntimeKey = runtimeDataKey(selection);
    const runtimeMappings = selectedRuntimeKey
      ? runtimeData[selectedRuntimeKey] || detectRuntimeFields(workingDraft).map((field) => ({ field, strategy: defaultRuntimeStrategy(field, workingDraft) }))
      : [];
    let datasetValues: Record<string, string> = {};
    try {
      datasetValues = await resolveDatasetValues(runtimeMappings);
    } catch (error) {
      setResponse({ ...emptyResponseState(), statusText: 'Test data unavailable', body: error instanceof Error ? error.message : 'Test data could not be resolved', isJson: false, startedAt: Date.now(), finishedAt: Date.now(), requestUrl: draft.url, requestMethod: draft.method });
      setLoading(false);
      return;
    }
    applyRuntimeData(workingDraft, runtimeMappings, environmentVariables, datasetValues);
    const envResolved = replaceTemplateVariables(workingDraft.url, environmentVariables);
    workingDraft.url = envResolved;

    const preResult = await runSandboxedScript({
      phase: 'pre-request',
      script: workingDraft.preRequestScript,
      request: { method: workingDraft.method, url: workingDraft.url, headers: requestHeadersToRecord(workingDraft.headers), body: payloadFromDraft(workingDraft) },
      variables: environmentVariables,
    });
    setLastScriptOutput(preResult.logs);
    applyScriptMutations(workingDraft, preResult.mutations);
    Object.entries(preResult.variables).forEach(([key, value]) => {
      if (!/(token|secret|password|api.?key|authorization|credential|private.?key|access.?key)/i.test(key)) environmentVariables[key] = value;
    });
    if (!preResult.ok) {
      setResponse((current) => ({
        ...current,
        status: null,
        statusText: 'Script error',
        body: preResult.error || 'Pre-request script failed',
        isJson: false,
        startedAt: Date.now(),
        finishedAt: Date.now(),
        requestUrl: workingDraft.url,
        requestMethod: workingDraft.method,
      }));
      setLoading(false);
      return;
    }

    // The preview override is the last data-layer input before the outbound
    // adapter reads this draft. It remains request-local and cannot alter the
    // editor, a FieldDataRule, or a stored TestCase version.
    workingDraft = applyCanonicalTemporaryOverrides(workingDraft, temporaryOverrides);

    try {
      const resolvedPathParams = rowsToRecord(workingDraft.pathParams);
      const resolvedQueryParams = rowsToRecord(workingDraft.queryParams);
      const bodyParams = rowsToRecord(workingDraft.urlEncodedRows);
      const resolvedAuth = {
        ...workingDraft.auth,
        bearerToken: replaceTemplateVariables(workingDraft.auth.bearerToken, environmentVariables)
          || (workingDraft.auth.type === 'bearer' ? environmentVariables.accessToken || environmentVariables.access_token || '' : ''),
        oauth2Token: replaceTemplateVariables(workingDraft.auth.oauth2Token, environmentVariables)
          || (workingDraft.auth.type === 'oauth2' ? environmentVariables.accessToken || environmentVariables.access_token || '' : ''),
        keyValue: replaceTemplateVariables(workingDraft.auth.keyValue, environmentVariables),
      };
      const auth = getAuthHeadersAndQuery(resolvedAuth);
      const baseHeaders = Object.fromEntries(Object.entries(requestHeadersToRecord(workingDraft.headers)).map(([name, value]) => [name, replaceTemplateVariables(value, environmentVariables)]));

      const headers = new Headers(baseHeaders);
      Object.entries(auth.headers).forEach(([name, value]) => headers.set(name, value));

      const urlWithParams = resolveUrl(
        workingDraft.url,
        resolvedPathParams,
        { ...resolvedQueryParams, ...auth.query },
        environmentVariables,
      );

      if (workingDraft.bodyMode === 'form-data') {
        const body = new FormData();
        workingDraft.formDataRows.forEach((row) => {
          if (row.enabled && row.key.trim()) body.append(row.key.trim(), replaceTemplateVariables(row.value, environmentVariables));
        });
        headers.delete('Content-Type');
        const startedAt = Date.now();
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), workingDraft.settings.timeoutMs);
        const res = await fetch(urlWithParams, {
          method: workingDraft.method,
          headers,
          body,
          credentials: workingDraft.settings.withCredentials ? 'include' : 'same-origin',
          redirect: workingDraft.settings.followRedirects ? 'follow' : 'manual',
          signal: controller.signal,
        });
        window.clearTimeout(timeoutId);
        const text = await res.text();
        const formatted = formatResponseBody(text);
        const sizeBytes = new Blob([text]).size;
        const responseState: ResponseState = {
          status: res.status,
          statusText: res.statusText,
          durationMs: Date.now() - startedAt,
          sizeBytes,
          headers: Array.from(res.headers.entries()),
          body: formatted.body,
          isJson: formatted.isJson,
          cookies: getCookieStrings(Array.from(res.headers.entries())),
          tests: [],
          startedAt,
          finishedAt: Date.now(),
          requestUrl: urlWithParams,
          requestMethod: workingDraft.method,
        };
        const testResults = await runTestsOnResponse(workingDraft, responseState, environmentVariables);
        setResponse({ ...responseState, tests: testResults });
        const cachedKey = responseCacheKey(selection);
        if (cachedKey) setResponseCache((current) => ({ ...current, [cachedKey]: { ...responseState, tests: testResults } }));
        captureOAuthToken(responseState);
        captureRuntimeResponse(responseState, runtimeMappings);
        setHistory((current) => [makeHistoryEntry(workingDraft, responseState), ...current].slice(0, 20));
        setActiveRequestLog(`${res.status} ${res.statusText}`);
        setLoading(false);
        return;
      }

      let bodyInit: BodyInit | null = null;
      let bodyHeadersToRemove: string[] = [];
      if (workingDraft.bodyMode === 'x-www-form-urlencoded') {
        const params = new URLSearchParams();
        workingDraft.urlEncodedRows.forEach((row) => {
          if (row.enabled && row.key.trim()) params.append(row.key.trim(), replaceTemplateVariables(row.value, environmentVariables));
        });
        bodyInit = params.toString();
        headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
      } else if (workingDraft.bodyMode === 'raw') {
        const selectedType = RAW_BODY_TYPES.find((item) => item.value === workingDraft.rawBodyType);
        bodyInit = replaceTemplateVariables(workingDraft.rawBody, environmentVariables);
        if (selectedType) headers.set('Content-Type', selectedType.contentType);
      } else if (workingDraft.bodyMode === 'binary') {
        if (!workingDraft.binaryFile) throw new Error('Choose a file for binary upload.');
        bodyInit = workingDraft.binaryFile;
      } else if (workingDraft.bodyMode === 'graphql') {
        const variables = workingDraft.graphqlVariables.trim() ? (parseJsonSafely(replaceTemplateVariables(workingDraft.graphqlVariables, environmentVariables)) ?? {}) : {};
        bodyInit = JSON.stringify({
          query: replaceTemplateVariables(workingDraft.graphqlQuery, environmentVariables),
          variables,
        });
        headers.set('Content-Type', 'application/json');
      }
      bodyHeadersToRemove.forEach((name) => headers.delete(name));
      const startedAt = Date.now();
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), workingDraft.settings.timeoutMs);
      const res = await fetch(urlWithParams, {
        method: workingDraft.method,
        headers,
        body: bodyInit,
        credentials: workingDraft.settings.withCredentials ? 'include' : 'same-origin',
        redirect: workingDraft.settings.followRedirects ? 'follow' : 'manual',
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const text = await res.text();
      const formatted = formatResponseBody(text);
      const sizeBytes = new Blob([text]).size;
      const responseState: ResponseState = {
        status: res.status,
        statusText: res.statusText,
        durationMs: Date.now() - startedAt,
        sizeBytes,
        headers: Array.from(res.headers.entries()),
        body: formatted.body,
        isJson: formatted.isJson,
        cookies: getCookieStrings(Array.from(res.headers.entries())),
        tests: [],
        startedAt,
        finishedAt: Date.now(),
        requestUrl: urlWithParams,
        requestMethod: workingDraft.method,
      };
      const testResults = await runTestsOnResponse(workingDraft, responseState, environmentVariables);
      setResponse({ ...responseState, tests: testResults });
      const cachedKey = responseCacheKey(selection);
      if (cachedKey) setResponseCache((current) => ({ ...current, [cachedKey]: { ...responseState, tests: testResults } }));
      captureOAuthToken(responseState);
      captureRuntimeResponse(responseState, runtimeMappings);
      setHistory((current) => [makeHistoryEntry(workingDraft, responseState), ...current].slice(0, 20));
      setActiveRequestLog(`${res.status} ${res.statusText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      setResponse({
        ...emptyResponseState(),
        statusText: 'Request failed',
        body: message,
        isJson: false,
        requestUrl: draft.url,
        requestMethod: draft.method,
        startedAt: Date.now(),
        finishedAt: Date.now(),
      });
      setActiveRequestLog(message);
    } finally {
      setLoading(false);
    }
  };

  async function runTestsOnResponse(currentDraft: RequestDraft, responseState: ResponseState, variables: Record<string, string>): Promise<TestResult[]> {
    const result = await runSandboxedScript({
      phase: 'test',
      script: currentDraft.testScript,
      request: { method: currentDraft.method, url: currentDraft.url, headers: requestHeadersToRecord(currentDraft.headers), body: payloadFromDraft(currentDraft) },
      response: { status: responseState.status, statusText: responseState.statusText, headers: Object.fromEntries(responseState.headers), body: responseState.body },
      variables,
    });
    setLastScriptOutput(result.logs);
    const results: TestResult[] = result.assertions;
    if (!result.ok) {
      results.push({ name: 'Test script', passed: false, message: result.error || 'Test script failed' });
    }
    return results;
  }

  const selectedCollectionMeta = selectedApiEndpoint
    ? apiCollections.find((collection) => collection.id === selectedApiEndpoint.groupId) ?? null
    : null;

  const selectedManualRecord = selection?.kind === 'manual' ? manualRequests.find((item) => item.id === selection.id) ?? null : null;
  const selectedSavedRecord = selection?.kind === 'saved' ? savedRequests.find((item) => item.id === selection.id) ?? null : null;
  const runtimeSelectionKey = runtimeDataKey(selection);
  const runtimeFields = React.useMemo(() => detectRuntimeFields(draft), [draft]);
  const runtimeMappings = React.useMemo<RuntimeDataMapping[]>(() => {
    if (!runtimeSelectionKey) return runtimeFields.map((field) => ({ field, strategy: defaultRuntimeStrategy(field, draft) }));
    const saved = runtimeData[runtimeSelectionKey] || [];
    return runtimeFields.map((field) => saved.find((mapping) => mapping.field.toLowerCase() === field.toLowerCase()) || {
      field,
      strategy: defaultRuntimeStrategy(field, draft),
    });
  }, [draft, runtimeData, runtimeFields, runtimeSelectionKey]);
  const updateRuntimeMapping = (field: string, patch: Partial<RuntimeDataMapping>) => {
    if (!runtimeSelectionKey) return;
    setRuntimeData((current) => {
      const existing = current[runtimeSelectionKey] || runtimeMappings;
      const next = existing.some((mapping) => mapping.field === field)
        ? existing.map((mapping) => mapping.field === field ? { ...mapping, ...patch } : mapping)
        : [...existing, { field, strategy: defaultRuntimeStrategy(field, draft), ...patch }];
      return { ...current, [runtimeSelectionKey]: next };
    });
  };

  const selectedItemDescription = selectedApiEndpoint?.description
    || selectedManualRecord?.draft.name
    || selectedSavedRecord?.draft.name
    || 'Choose a request from the explorer or create a new one.';

  const responseBodyDisplay = React.useMemo(() => {
    if (responseBodyView === 'raw') return response.body;
    if (response.isJson) return response.body;
    return response.body;
  }, [response.body, response.isJson, responseBodyView]);

  const explorerTabCounts = {
    imported: apiCollections.reduce((sum, item) => sum + item.endpoints.length, 0),
    manual: manualRequests.length,
    saved: savedRequests.length,
    env: environments.length,
  };

  const currentRequestInfo = [
    `${draft.method}`,
    draft.name,
    draft.url,
  ];

  return (
    <div className='api-execution relative min-h-full bg-background text-sm text-text'>
      <div className='pointer-events-none absolute inset-0 opacity-60'>
        <div className='absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl' />
        <div className='absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl' />
        <div className='absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl' />
      </div>

      <div className='relative mx-auto max-w-[1600px] px-4 pb-5 sm:px-6 lg:px-8' style={{ paddingTop: '24px' }}>
        <div className='mb-4 p-0'>
          <div className='relative z-50 flex justify-end'>
            <div className='flex flex-wrap items-center justify-end gap-3'>
              <Button type='button' variant='outline' className='h-11 w-44 border-border bg-background/40 px-4 text-sm font-medium text-text' onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className='mr-2 h-4 w-4' />
                Import API
              </Button>
              <Button type='button' variant='outline' className='h-11 w-44 border-border bg-background/40 px-4 text-sm font-medium text-text' onClick={createNewRequest}>
                <Plus className='mr-2 h-4 w-4' />
                New Request
              </Button>
              <div className='relative z-50 w-44'>
                <button
                  type='button'
                  onClick={() => setEnvironmentMenuOpen((current) => !current)}
                  className='flex h-11 w-full items-center justify-between rounded-lg border border-violet-400/30 bg-violet-400/10 px-4 text-left text-sm font-medium text-primary outline-none transition-colors hover:bg-violet-400/15 focus:border-violet-300/60'
                  aria-expanded={environmentMenuOpen}
                  aria-haspopup='listbox'
                  aria-label='Select environment'
                  title='Select environment for request execution'
                >
                  <span className='truncate'>{selectedEnvironment?.name ?? (environmentToken ? 'Default environment' : 'No environment')}</span>
                  <ChevronDown className={`ml-2 h-4 w-4 shrink-0 transition-transform ${environmentMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {environmentMenuOpen && (
                  <div className='absolute left-0 top-full z-[100] mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl' role='listbox'>
                    <button
                      type='button'
                      role='option'
                      aria-selected={!activeEnvironmentId}
                      onClick={() => {
                        setActiveEnvironmentId('');
                        setEnvironmentMenuOpen(false);
                      }}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${!activeEnvironmentId ? 'bg-background/60 text-primary' : 'text-text hover:bg-background/60'}`}
                    >
                      No environment
                    </button>
                    {environments.map((environment) => (
                      <button
                        key={environment.id}
                        type='button'
                        role='option'
                        aria-selected={activeEnvironmentId === environment.id}
                        onClick={() => {
                          void selectEnvironment(environment.id);
                          setEnvironmentMenuOpen(false);
                        }}
                        className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${activeEnvironmentId === environment.id ? 'bg-background/60 text-primary' : 'text-text hover:bg-background/60'}`}
                      >
                        {environment.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button type='button' variant='outline' className='h-11 border-border bg-background/40 px-4 text-sm font-medium text-text' onClick={() => setEnvironmentManagerOpen(true)}>
                <Settings2 className='mr-2 h-4 w-4' />
                Manage environments
              </Button>
              <Button type='button' variant='outline' className='h-11 w-44 border-error/30 bg-error/10 px-4 text-sm font-medium text-error hover:bg-error/20 disabled:border-border disabled:bg-background/40 disabled:text-text-secondary disabled:opacity-100' onClick={() => setApiDeleteConfirmOpen(true)} disabled={importedArtifacts.filter((item) => item.kind === 'api').length === 0}>
                <Trash2 className='mr-2 h-4 w-4' />
                Delete APIs
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type='file'
            multiple
            accept='.json,.yaml,.yml,.env,.env.local,.txt,.har'
            className='hidden'
            onChange={(event) => {
              const files = event.target.files;
              if (!files?.length) return;
              setApiImportFiles(Array.from(files));
              event.target.value = '';
            }}
          />

          {selectedEnvironment && (
            <div className='mt-4 flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className='border-border bg-background/40 text-text'>Environment active</Badge>
              <Badge variant='outline' className='border-border bg-background/40 text-text'>{selectedEnvironment.name}</Badge>
              <span className='text-xs text-text-secondary'>{Object.keys(selectedEnvironment.variables).length} variables</span>
            </div>
          )}
        </div>

        <div className='grid items-start gap-4 lg:grid-cols-[minmax(340px,0.3fr)_minmax(0,0.7fr)]'>
          <Card className='flex min-h-0 flex-col overflow-hidden border-border bg-background/40 text-text shadow-2xl backdrop-blur-xl' style={{ height: explorerHeight ? `${explorerHeight}px` : 'calc(100vh - 180px)' }}>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base text-text'>API Explorer</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scrollbar-none'>
              <section className='rounded-2xl border border-border bg-surface p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <FolderOpen className='h-4 w-4 text-cyan-300' />
                    <span className='font-medium text-text'>Imported APIs</span>
                  </div>
                  <Badge variant='outline' className='border-border bg-background/40 text-text'>{explorerTabCounts.imported}</Badge>
                </div>
                <div className='space-y-2'>
                  {visibleApiCollections.length > 0 ? visibleApiCollections.map((collection) => {
                    const expanded = expandedCollections[collection.id] !== false;
                    return (
                      <div key={collection.id} className='rounded-2xl border border-border bg-background/40'>
                        <button
                          type='button'
                          className='flex w-full items-center justify-between gap-3 px-3 py-2 text-left'
                          onClick={() => toggleCollection(collection.id)}
                        >
                          <div className='min-w-0'>
                            <div className='truncate text-sm font-semibold text-text'>{collection.name}</div>
                            <div className='text-[11px] text-text-secondary'>{collection.endpoints.length} endpoints</div>
                          </div>
                          {expanded ? <ChevronDown className='h-4 w-4 text-text-secondary' /> : <ChevronRight className='h-4 w-4 text-text-secondary' />}
                        </button>
                        {expanded && (
                          <div className='border-t border-border p-2'>
                            {groupEndpointsByFolder(collection.endpoints, collection.name).map(([folder, endpoints]) => (
                              <div key={folder} className='mb-3 last:mb-0'>
                                <button
                                  type='button'
                                  className='mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary hover:bg-background/40 hover:text-text'
                                  onClick={() => toggleFolder(`${collection.id}:${folder}`)}
                                >
                                  <FolderOpen className='h-3.5 w-3.5 text-cyan-300' />
                                  <span className='truncate'>{folder}</span>
                                  <span className='ml-auto'>{endpoints.length}</span>
                                  {expandedFolders[`${collection.id}:${folder}`] === false ? <ChevronRight className='h-3.5 w-3.5' /> : <ChevronDown className='h-3.5 w-3.5' />}
                                </button>
                                {expandedFolders[`${collection.id}:${folder}`] !== false && endpoints.map((endpoint) => {
                                  const active = selection?.kind === 'api-endpoint' && selection.endpointId === endpoint.id;
                                  return (
                                    <div
                                      key={endpoint.id}
                                      className={`mb-1 flex w-full items-center rounded-xl transition-colors last:mb-0 ${
                                        active ? 'bg-primary/15 text-primary' : 'hover:bg-background/40 text-text'
                                      }`}
                                    >
                                      <button
                                        type='button'
                                        onClick={() => selectApiEndpoint(collection, endpoint)}
                                        className='flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left'
                                      >
                                        <Badge variant='outline' className={`border-border bg-background/40 text-[10px] ${httpMethodTextClass(endpoint.method)}`}>{endpoint.method}</Badge>
                                        <div className='min-w-0'>
                                          <div className='truncate text-xs font-medium'>{endpoint.name}</div>
                                        </div>
                                      </button>
                                      <button
                                        type='button'
                                        className='mr-2 rounded-lg p-1.5 text-text-secondary hover:bg-error/10 hover:text-error'
                                        aria-label={`Delete ${endpoint.name}`}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          setEndpointDeleteTarget({ collection, endpoint });
                                        }}
                                      >
                                        <Trash2 className='h-3.5 w-3.5' />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <EmptyState
                      className='py-8'
                      icon={<UploadCloud className='h-10 w-10' />}
                      iconLabel='No imported APIs'
                      title='No APIs imported'
                      description='Import an OpenAPI, Swagger or Postman file to populate the explorer.'
                    />
                  )}
                </div>
              </section>

              {false && <>
              <section className='rounded-2xl border border-border bg-surface p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <ClipboardList className='h-4 w-4 text-emerald-300' />
                    <span className='font-medium text-text'>Manual Requests</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='border-border bg-background/40 text-text'>{explorerTabCounts.manual}</Badge>
                    <button type='button' className='rounded-lg p-1 text-text-secondary hover:bg-background/40 hover:text-text' onClick={createNewRequest}><Plus className='h-4 w-4' /></button>
                    <button type='button' className='rounded-lg p-1 text-text-secondary hover:bg-background/40 hover:text-text' onClick={clearManualRequests}><Trash2 className='h-4 w-4' /></button>
                  </div>
                </div>
                <div className='space-y-2'>
                  {visibleManualRequests.length > 0 ? visibleManualRequests.map((item) => {
                    const active = selection?.kind === 'manual' && selection.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type='button'
                        onClick={() => selectManualRequest(item)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                          active ? 'bg-primary/15 text-primary' : 'hover:bg-background/40 text-text'
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium'>{item.draft.name}</div>
                          <div className='truncate text-[11px] text-text-secondary'>{item.draft.method} · {item.draft.url}</div>
                        </div>
                        <button type='button' className='rounded-lg p-1 text-text-secondary hover:bg-background/40 hover:text-text' onClick={(e) => { e.stopPropagation(); removeItem('manual', item.id); }}>
                          <X className='h-4 w-4' />
                        </button>
                      </button>
                    );
                  }) : (
                    <p className='px-1 py-2 text-xs text-text-secondary'>No manual requests yet. Create one with New Request.</p>
                  )}
                </div>
              </section>

              <section className='rounded-2xl border border-border bg-surface p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Save className='h-4 w-4 text-blue-300' />
                    <span className='font-medium text-text'>Saved Requests</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='border-border bg-background/40 text-text'>{explorerTabCounts.saved}</Badge>
                    <button type='button' className='rounded-lg p-1 text-text-secondary hover:bg-background/40 hover:text-text' onClick={clearSavedRequests}><Trash2 className='h-4 w-4' /></button>
                  </div>
                </div>
                <div className='space-y-2'>
                  {visibleSavedRequests.length > 0 ? visibleSavedRequests.map((item) => {
                    const active = selection?.kind === 'saved' && selection.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type='button'
                        onClick={() => selectSavedRequest(item)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                          active ? 'bg-primary/15 text-primary' : 'hover:bg-background/40 text-text'
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium'>{item.draft.name}</div>
                          <div className='truncate text-[11px] text-text-secondary'>{item.draft.method} · {item.draft.url}</div>
                        </div>
                        <button type='button' className='rounded-lg p-1 text-text-secondary hover:bg-background/40 hover:text-text' onClick={(e) => { e.stopPropagation(); removeItem('saved', item.id); }}>
                          <X className='h-4 w-4' />
                        </button>
                      </button>
                    );
                  }) : (
                    <p className='px-1 py-2 text-xs text-text-secondary'>Saved requests will appear here.</p>
                  )}
                </div>
              </section>

              <section className='rounded-2xl border border-border bg-surface p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Globe className='h-4 w-4 text-violet-300' />
                    <span className='font-medium text-text'>Environments</span>
                  </div>
                  <Badge variant='outline' className='border-border bg-background/40 text-text'>{explorerTabCounts.env}</Badge>
                </div>
                <div className='space-y-2'>
                  {visibleEnvironments.length > 0 ? visibleEnvironments.map((env) => {
                    const active = activeEnvironmentId === env.id;
                    return (
                      <button
                        key={env.id}
                        type='button'
                        onClick={() => { void selectEnvironment(env.id); }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                          active ? 'bg-primary/15 text-primary' : 'hover:bg-background/40 text-text'
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium'>{env.name}</div>
                          <div className='truncate text-[11px] text-text-secondary'>{Object.keys(env.variables).length} variables</div>
                        </div>
                        <Badge variant='outline' className='border-border bg-background/40 text-[10px] text-text'>ENV</Badge>
                      </button>
                    );
                  }) : (
                    <p className='px-1 py-2 text-xs text-text-secondary'>Import `.env` files to see them here.</p>
                  )}
                </div>
              </section>

              <section className='rounded-2xl border border-border bg-surface p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Database className='h-4 w-4 text-warning' />
                    <span className='font-medium text-text'>Unknown / raw</span>
                  </div>
                  <Badge variant='outline' className='border-border bg-background/40 text-text'>{unknownImports.length}</Badge>
                </div>
                <div className='space-y-2 text-xs text-text-secondary'>
                  {unknownImports.length > 0 ? unknownImports.map((item) => (
                    <div key={item.id} className='rounded-xl border border-border bg-background/40 p-2'>
                      <div className='font-medium text-text'>{item.name}</div>
                      <div>{item.summary}</div>
                    </div>
                  )) : <p>Raw files will appear here if they are not recognized as API or environment files.</p>}
                </div>
              </section>
              </>}
            </CardContent>
          </Card>

          <div className='space-y-4'>
            <Card ref={requestWorkspaceRef} className='relative z-40 overflow-visible border-border bg-background/40 text-text shadow-2xl backdrop-blur-xl'>
              <CardHeader className='pb-3'>
                <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
                  <div className='min-w-0 flex-1'>
                    <div className={`flex w-full min-w-0 items-center rounded-xl border bg-surface ${
                      missingUrlVariables.length > 0
                        ? 'border-border'
                        : hasResolvedUrlVariables
                          ? 'border-emerald-400/60 bg-emerald-400/5 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]'
                          : 'border-white/20'
                    }`}>
                      <div className='relative shrink-0 border-r border-border'>
                        <button
                          type='button'
                          onClick={() => setMethodMenuOpen((current) => !current)}
                          className={`flex h-12 w-28 items-center justify-between gap-2 px-4 text-left text-sm font-semibold outline-none hover:bg-background/40 ${httpMethodTextClass(draft.method)}`}
                          aria-expanded={methodMenuOpen}
                          aria-haspopup='listbox'
                          aria-label='Request method'
                        >
                          {draft.method}
                          <ChevronDown className={`h-4 w-4 transition-transform ${methodMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {methodMenuOpen && (
                          <div className='absolute left-0 top-full z-30 mt-1 w-28 overflow-hidden rounded-lg border border-border bg-surface shadow-xl' role='listbox'>
                            {HTTP_METHODS.map((method) => (
                              <button
                                key={method}
                                type='button'
                                role='option'
                                aria-selected={draft.method === method}
                                onClick={() => {
                                  setDraft((current) => ({ ...current, method }));
                                  setMethodMenuOpen(false);
                                }}
                                className={`block w-full px-4 py-2 text-left text-sm font-medium hover:bg-background/60 ${draft.method === method ? 'bg-background/60' : ''} ${httpMethodTextClass(method)}`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input
                        value={draft.url}
                        onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                        className={`h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-text-secondary ${missingUrlVariables.length > 0 ? 'text-text-secondary' : 'text-text'}`}
                        placeholder='Enter request URL'
                        aria-label='Request URL'
                        title={urlVariablePreview || 'No environment variables in this URL'}
                      />
                      {urlTemplateVariables.length > 0 && (
                        <span className={`mr-3 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          missingUrlVariables.length > 0 ? 'bg-background/60 text-text-secondary' : 'bg-success/15 text-success'
                        }`} title={missingUrlVariables.length > 0 ? `Missing environment variables: ${missingUrlVariables.join(', ')}` : 'Environment variables resolved'}>
                          {missingUrlVariables.length > 0 ? 'Inactive' : 'Active'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {saveConfirmation && (
                      <span role='status' className='rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs font-medium text-success'>
                        {saveConfirmation}
                      </span>
                    )}
                    <Button type='button' variant='outline' className='border-border bg-background/40 text-text' onClick={saveCurrentRequest}>
                      <Save className='mr-2 h-4 w-4' />
                      Save
                    </Button>
                    <Button type='button' onClick={() => void executeRequest()} loading={loading}>
                      <Send className='mr-2 h-4 w-4' />
                      Send
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2'>
                  {(['params', 'headers', 'authorization', 'body', 'scripts', 'tests', 'settings'] as const).map((tab) => (
                    <button
                      key={tab}
                      type='button'
                      onClick={() => setRequestTab(tab)}
                      className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                        requestTab === tab ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-background/40 hover:text-text'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {requestTab === 'params' && (
                  <div className='space-y-4'>
                    <section className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='mb-3 flex items-center justify-between'>
                        <h3 className='font-medium text-text'>Path Parameters</h3>
                        <Badge variant='outline' className='border-border bg-background/40 text-text'>{draft.pathParams.length}</Badge>
                      </div>
                      <div className='space-y-2'>
                        {draft.pathParams.length > 0 ? draft.pathParams.map((row, index) => (
                          <div key={row.id} className='grid gap-2 md:grid-cols-[1fr_1fr_140px_1fr_auto]'>
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, pathParams: current.pathParams.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, pathParams: current.pathParams.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Value' />
                            <select className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none'>
                              <option>string</option>
                              <option>number</option>
                              <option>boolean</option>
                            </select>
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, pathParams: current.pathParams.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-border bg-background/40 px-3 text-sm text-text' onClick={() => setDraft((current) => ({ ...current, pathParams: current.pathParams.filter((item) => item.id !== row.id) }))}>
                              Remove
                            </button>
                          </div>
                        )) : (
                          <p className='text-sm text-text-secondary'>No path parameters detected.</p>
                        )}
                      </div>
                    </section>

                    <section className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='mb-3 flex items-center justify-between'>
                        <h3 className='font-medium text-text'>Query Parameters</h3>
                        <div className='flex gap-2'>
                          <Button type='button' variant='outline' className='border-border bg-background/40 text-text' size='sm' onClick={() => setDraft((current) => ({ ...current, queryParams: [...current.queryParams, createIdRow()] }))}>
                            <Plus className='mr-2 h-4 w-4' />
                            Add
                          </Button>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        {draft.queryParams.map((row) => (
                          <div key={row.id} className='grid gap-2 md:grid-cols-[72px_1fr_1fr_1fr_auto]'>
                            <input type='checkbox' checked={row.enabled} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, enabled: e.target.checked } : item) }))} className='h-4 w-4 rounded border-white/20 accent-cyan-400' />
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Value' />
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-border bg-background/40 px-3 text-sm text-text' onClick={() => setDraft((current) => ({ ...current, queryParams: current.queryParams.filter((item) => item.id !== row.id) }))}>
                              Remove
                            </button>
                          </div>
                        ))}
                        {draft.queryParams.length === 0 && <p className='text-sm text-text-secondary'>Add query parameters to build the request URL.</p>}
                      </div>
                    </section>
                  </div>
                )}

                {requestTab === 'headers' && (
                  <section className='space-y-3 rounded-2xl border border-border bg-surface p-3'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium text-text'>Headers</h3>
                      <Button type='button' variant='outline' className='border-border bg-background/40 text-text' size='sm' onClick={() => setDraft((current) => ({ ...current, headers: [...current.headers, createHeaderRow()] }))}>
                        <Plus className='mr-2 h-4 w-4' />
                        Add header
                      </Button>
                    </div>
                    <div className='space-y-2'>
                      {draft.headers.map((row) => (
                        <div key={row.id} className='grid gap-2 md:grid-cols-[1fr_1fr_auto]'>
                          <input value={row.name} onChange={(e) => setDraft((current) => ({ ...current, headers: current.headers.map((item) => item.id === row.id ? { ...item, name: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Header name' />
                          <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, headers: current.headers.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Header value' />
                          <button type='button' className='rounded-xl border border-border bg-background/40 px-3 text-sm text-text' onClick={() => setDraft((current) => ({ ...current, headers: current.headers.filter((item) => item.id !== row.id) }))}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {requestTab === 'authorization' && (
                  <section className='space-y-4 rounded-2xl border border-border bg-surface p-3'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium text-text'>Authorization</h3>
                      <Shield className='h-4 w-4 text-text-secondary' />
                    </div>
                    <label className='block'>
                      <span className='mb-1.5 block text-sm font-medium text-text'>Auth type</span>
                      <select value={draft.auth.type} onChange={(e) => setDraft((current) => {
                        const type = e.target.value as AuthType;
                        return {
                          ...current,
                          auth: {
                            ...current.auth,
                            type,
                            bearerToken: type === 'bearer' && !current.auth.bearerToken ? '{{accessToken}}' : current.auth.bearerToken,
                            oauth2Token: type === 'oauth2' && !current.auth.oauth2Token ? '{{accessToken}}' : current.auth.oauth2Token,
                          },
                        };
                      })} className='h-10 w-full rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none'>
                        {AUTH_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <div className='flex items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2'>
                      <span className='text-sm text-text-secondary'>OAuth token</span>
                      <Badge variant={oauthTokenState === 'Active' ? 'success' : oauthTokenState === 'Expired' ? 'destructive' : 'outline'} className={oauthTokenState === 'Missing token' ? 'border-border bg-background/40 text-text-secondary' : ''}>
                        {oauthTokenState}
                      </Badge>
                    </div>
                    {draft.auth.type === 'bearer' && (
                      <div className='space-y-2'>
                        <div className='group relative inline-flex max-w-full'>
                          <span className='rounded-lg border border-dashed border-border bg-background/60 px-3 py-2 text-sm text-primary'>{draft.auth.bearerToken || '{{accessToken}}'}</span>
                          <div className='pointer-events-none absolute left-0 top-full z-30 mt-2 w-[min(32rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface p-3 opacity-0 shadow-2xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'>
                            <input aria-label='Resolved bearer token' value={environmentToken} onChange={(e) => updateEnvironmentToken(e.target.value)} className='h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-text outline-none' placeholder='Add token value' />
                            <div className='mt-2 flex items-center justify-between text-xs text-text-secondary'><span>{activeEnvironment?.name || 'Environment'}</span><span>{environmentToken ? 'Resolved token' : 'Missing token'}</span></div>
                          </div>
                        </div>
                        {environmentToken && <p className='text-xs text-emerald-200'>Using the active environment token automatically.</p>}
                      </div>
                    )}
                    {draft.auth.type === 'basic' && (
                      <div className='grid gap-2 md:grid-cols-2'>
                        <input value={draft.auth.username} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, username: e.target.value } }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Username' />
                        <input value={draft.auth.password} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, password: e.target.value } }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Password' type='password' />
                      </div>
                    )}
                    {draft.auth.type === 'apiKey' && (
                      <div className='grid gap-2 md:grid-cols-3'>
                        <input value={draft.auth.keyName} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, keyName: e.target.value } }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Header/query name' />
                        <select value={draft.auth.keyLocation} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, keyLocation: e.target.value as 'header' | 'query' | 'cookie' } }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none'>
                          <option value='header'>Header</option>
                          <option value='query'>Query</option>
                          <option value='cookie'>Cookie</option>
                        </select>
                        <input value={draft.auth.keyValue} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, keyValue: e.target.value } }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Value' />
                      </div>
                    )}
                    {draft.auth.type === 'oauth2' && (
                      <div className='space-y-2'>
                        <div className='group relative inline-flex max-w-full'>
                          <span className='rounded-lg border border-dashed border-border bg-background/60 px-3 py-2 text-sm text-primary'>{draft.auth.oauth2Token || '{{accessToken}}'}</span>
                          <div className='pointer-events-none absolute left-0 top-full z-30 mt-2 w-[min(32rem,calc(100vw-3rem))] rounded-xl border border-border bg-surface p-3 opacity-0 shadow-2xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100'>
                            <input aria-label='Resolved OAuth token' value={environmentToken} onChange={(e) => updateEnvironmentToken(e.target.value)} className='h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-text outline-none' placeholder='Add token value' />
                            <div className='mt-2 flex items-center justify-between text-xs text-text-secondary'><span>{activeEnvironment?.name || 'Environment'}</span><span>{environmentToken ? 'Resolved token' : 'Missing token'}</span></div>
                          </div>
                        </div>
                        <input value={draft.auth.oauth2Scopes} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, oauth2Scopes: e.target.value } }))} className='h-10 w-full rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Scopes, space separated' />
                        {environmentToken && !draft.auth.oauth2Token && <p className='text-xs text-emerald-200'>Using the active environment token automatically.</p>}
                      </div>
                    )}
                  </section>
                )}

                {requestTab === 'body' && (
                  <section className='space-y-4 rounded-2xl border border-border bg-surface p-3'>
                    <div className='flex flex-wrap gap-2'>
                      {BODY_MODES.map((option) => (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() => setDraft((current) => ({ ...current, bodyMode: option.value }))}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            draft.bodyMode === option.value ? 'border-cyan-400/40 bg-primary/15 text-primary' : 'border-border bg-background/40 text-text-secondary hover:bg-background/60'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {draft.bodyMode === 'none' && <p className='rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-text-secondary'>No body will be sent.</p>}
                    {draft.bodyMode === 'raw' && (
                      <div className='space-y-3'>
                        <select value={draft.rawBodyType} onChange={(e) => setDraft((current) => ({ ...current, rawBodyType: e.target.value as RawBodyType }))} className='h-10 w-full rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none'>
                          {RAW_BODY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <textarea value={draft.rawBody} onChange={(e) => setDraft((current) => ({ ...current, rawBody: e.target.value }))} rows={12} className='w-full rounded-2xl border border-border bg-background/80 p-3 font-mono text-sm text-text outline-none' />
                      </div>
                    )}
                    {draft.bodyMode === 'form-data' && (
                      <div className='space-y-2'>
                        {draft.formDataRows.map((row) => (
                          <div key={row.id} className='grid gap-2 md:grid-cols-[72px_1fr_1fr_1fr_auto]'>
                            <input type='checkbox' checked={row.enabled} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, enabled: e.target.checked } : item) }))} className='h-4 w-4 rounded border-white/20 accent-cyan-400' />
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Value' />
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-border bg-background/40 px-3 text-sm text-text' onClick={() => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.filter((item) => item.id !== row.id) }))}>Remove</button>
                          </div>
                        ))}
                        <Button type='button' variant='outline' className='border-border bg-background/40 text-text' onClick={() => setDraft((current) => ({ ...current, formDataRows: [...current.formDataRows, createIdRow()] }))}>
                          <Plus className='mr-2 h-4 w-4' />
                          Add row
                        </Button>
                      </div>
                    )}
                    {draft.bodyMode === 'x-www-form-urlencoded' && (
                      <div className='space-y-2'>
                        {draft.urlEncodedRows.map((row) => (
                          <div key={row.id} className='grid gap-2 md:grid-cols-[72px_1fr_1fr_1fr_auto]'>
                            <input type='checkbox' checked={row.enabled} onChange={(e) => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.map((item) => item.id === row.id ? { ...item, enabled: e.target.checked } : item) }))} className='h-4 w-4 rounded border-white/20 accent-cyan-400' />
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Value' />
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-border bg-background/40 px-3 text-sm text-text' onClick={() => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.filter((item) => item.id !== row.id) }))}>Remove</button>
                          </div>
                        ))}
                        <Button type='button' variant='outline' className='border-border bg-background/40 text-text' onClick={() => setDraft((current) => ({ ...current, urlEncodedRows: [...current.urlEncodedRows, createIdRow()] }))}>
                          <Plus className='mr-2 h-4 w-4' />
                          Add row
                        </Button>
                      </div>
                    )}
                    {draft.bodyMode === 'binary' && (
                      <div className='space-y-3'>
                        <input ref={binaryFileInputRef} type='file' className='block w-full rounded-2xl border border-border bg-background/80 px-3 py-2 text-sm text-text file:mr-4 file:rounded-lg file:border-0 file:bg-background/60 file:px-3 file:py-2 file:text-sm file:font-medium file:text-text' onChange={(event) => setDraft((current) => ({ ...current, binaryFile: event.target.files?.[0] ?? null }))} />
                        <div className='rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-text-secondary'>
                          {draft.binaryFile ? `Selected file: ${draft.binaryFile.name}` : 'Choose a file to upload as the request body.'}
                        </div>
                      </div>
                    )}
                    {draft.bodyMode === 'graphql' && (
                      <div className='space-y-3'>
                        <textarea value={draft.graphqlQuery} onChange={(e) => setDraft((current) => ({ ...current, graphqlQuery: e.target.value }))} rows={8} className='w-full rounded-2xl border border-border bg-background/80 p-3 font-mono text-sm text-text outline-none' placeholder='query Example { __typename }' />
                        <textarea value={draft.graphqlVariables} onChange={(e) => setDraft((current) => ({ ...current, graphqlVariables: e.target.value }))} rows={8} className='w-full rounded-2xl border border-border bg-background/80 p-3 font-mono text-sm text-text outline-none' placeholder='{"id":123}' />
                      </div>
                    )}
                  </section>
                )}

                {requestTab === 'scripts' && (
                  <section className='space-y-4 rounded-2xl border border-border bg-surface p-3'>
                    <label className='block'>
                      <span className='mb-1.5 block text-sm font-medium text-text'>Pre-request script</span>
                      <textarea value={draft.preRequestScript} onChange={(e) => setDraft((current) => ({ ...current, preRequestScript: e.target.value }))} rows={10} className='w-full rounded-2xl border border-border bg-background/80 p-3 font-mono text-sm text-text outline-none' placeholder='helpers.setHeader("X-Test", "1")' />
                    </label>
                    <div className='rounded-2xl border border-border bg-background/40 p-3 text-sm text-text-secondary'>
                      <div className='mb-2 font-medium text-text'>Script output</div>
                      {lastScriptOutput.length > 0 ? lastScriptOutput.map((line, index) => <div key={index}>{line}</div>) : <p>No output yet.</p>}
                      <p className='mt-2 text-xs'>Sandbox {SCRIPT_SANDBOX_VERSION}: use variables.get/set and helpers.setHeader/setQueryParam/setPathParam/setUrl/setBody. DOM, storage, network, and arbitrary JavaScript are blocked.</p>
                    </div>
                  </section>
                )}

                {requestTab === 'tests' && (
                  <section className='space-y-4 rounded-2xl border border-border bg-surface p-3'>
                    <label className='block'>
                      <span className='mb-1.5 block text-sm font-medium text-text'>Tests</span>
                      <textarea value={draft.testScript} onChange={(e) => setDraft((current) => ({ ...current, testScript: e.target.value }))} rows={10} className='w-full rounded-2xl border border-border bg-background/80 p-3 font-mono text-sm text-text outline-none' placeholder='test("status is 200", () => assert(response.status === 200, "status is 200"))' />
                    </label>
                    <div className='space-y-2'>
                      {response.tests.length > 0 ? response.tests.map((test, index) => (
                        <div key={index} className={`rounded-xl border px-3 py-2 text-sm ${test.passed ? 'border-emerald-400/20 bg-success/10 text-success' : 'border-error/20 bg-error/10 text-error'}`}>
                          {test.name} · {test.message || (test.passed ? 'Passed' : 'Failed')}
                        </div>
                      )) : <p className='text-sm text-text-secondary'>Run the request to see test results here.</p>}
                    </div>
                  </section>
                )}

                {requestTab === 'settings' && (
                  <section className='space-y-4 rounded-2xl border border-border bg-surface p-3'>
                    <div className='rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3'>
                      <div className='mb-1 flex items-center justify-between gap-3'>
                        <div>
                          <div className='text-sm font-medium text-text'>Runtime test data</div>
                          <p className='mt-1 text-xs text-text-secondary'>Generate fresh values for this endpoint on every request.</p>
                        </div>
                        <Badge variant='outline' className='border-cyan-400/30 bg-cyan-400/10 text-primary'>Per endpoint</Badge>
                      </div>
                      {runtimeMappings.length > 0 ? (
                        <div className='mt-3 space-y-2'>
                          {runtimeMappings.map((mapping) => (
                            <div key={mapping.field} className='grid gap-2 md:grid-cols-[1fr_180px_1fr]'>
                              <div className='flex items-center rounded-xl border border-border bg-surface px-3 text-sm text-text'>
                                {mapping.field}
                              </div>
                              <select
                                value={mapping.strategy}
                                onChange={(event) => updateRuntimeMapping(mapping.field, { strategy: event.target.value as RuntimeDataStrategy })}
                                className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none'
                              >
                                {runtimeStrategyOptions(mapping.field, draft).map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                              {mapping.strategy === 'dataset' ? (
                                <div className='grid grid-cols-2 gap-2'>
                                  <select
                                    value={mapping.datasetId || ''}
                                    onChange={(event) => updateRuntimeMapping(mapping.field, { datasetId: event.target.value })}
                                    className='h-10 min-w-0 rounded-xl border border-border bg-background/80 px-2 text-xs text-text outline-none'
                                  >
                                    <option value=''>Choose dataset</option>
                                    {testDataDatasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
                                  </select>
                                  <input
                                    value={mapping.column || ''}
                                    onChange={(event) => updateRuntimeMapping(mapping.field, { column: event.target.value })}
                                    placeholder='Column, e.g. email'
                                    className='h-10 min-w-0 rounded-xl border border-border bg-background/80 px-2 text-xs text-text outline-none placeholder:text-text-secondary'
                                  />
                                </div>
                              ) : (mapping.strategy === 'environment' || mapping.strategy === 'response') ? (
                                <input
                                  value={mapping.source || ''}
                                  onChange={(event) => updateRuntimeMapping(mapping.field, { source: event.target.value })}
                                  placeholder={mapping.strategy === 'response' ? 'Response field, e.g. id' : 'Environment key'}
                                  className='h-10 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none placeholder:text-text-secondary'
                                />
                              ) : (
                                <div className='flex items-center px-2 text-xs text-text-secondary'>
                                  {mapping.strategy === 'none' ? 'Keeps the configured value' : 'Created at send time'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className='mt-3 rounded-xl border border-dashed border-border p-3 text-sm text-text-secondary'>No dynamic fields detected in this request. Add a field such as `email` or `username` to configure runtime data.</p>
                      )}
                      <p className='mt-3 text-xs text-text-secondary'>Generated values are injected only for execution. Successful response mappings are stored in the active environment for later requests.</p>
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>

            <div className='space-y-4'>
              <Card ref={responsePanelRef} className='relative z-10 border-border bg-background/40 text-text shadow-2xl backdrop-blur-xl'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <CardTitle className='text-base text-text'>Response</CardTitle>
                    </div>
                    <div className='flex items-center gap-2'>
                      {RESPONSE_TABS.map((tab) => (
                        <button key={tab.value} type='button' onClick={() => setResponseTab(tab.value)} className={`rounded-xl px-3 py-2 text-xs transition-colors ${responseTab === tab.value ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-background/40 hover:text-text'}`}>
                          {tab.label}
                        </button>
                      ))}
                      <Button type='button' variant='outline' size='sm' className='border-border bg-background/40 text-text' onClick={() => void copyResponse()} disabled={!response.body} title='Copy response'>
                        <Copy className='h-4 w-4' />
                      </Button>
                      <Button type='button' variant='outline' size='sm' className='border-error/30 bg-error/10 text-error hover:bg-error/20 disabled:border-border disabled:bg-background/40 disabled:text-text-secondary disabled:opacity-100' onClick={clearCurrentResponse} disabled={!response.body} title='Clear response'>
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {responseTab === 'response' && (
                    <>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div className='flex items-center gap-2'>
                          <Badge variant={response.status && response.status < 400 ? 'success' : response.status ? 'destructive' : 'outline'} className='px-3 py-1'>
                            {response.status ? `${response.status} ${response.statusText}` : 'No response yet'}
                          </Badge>
                          <Badge variant='outline' className='border-border bg-background/40 text-text'>{response.durationMs ?? 0} ms</Badge>
                          <Badge variant='outline' className='border-border bg-background/40 text-text'>{response.sizeBytes !== null ? toReadableSize(response.sizeBytes) : '0 B'}</Badge>
                        </div>
                        <div className='flex items-center gap-2'>
                          {RESPONSE_VIEW_MODES.map((mode) => (
                            <button key={mode.value} type='button' onClick={() => setResponseBodyView(mode.value)} className={`rounded-xl px-3 py-2 text-xs transition-colors ${responseBodyView === mode.value ? 'bg-background/60 text-text' : 'text-text-secondary hover:bg-background/40 hover:text-text'}`}>
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className='rounded-2xl border border-border bg-surface p-3'>
                        {responseBodyView === 'preview' ? (
                          <JsonViewer data={response.isJson ? parseJsonSafely(response.body) ?? response.body : response.body} className='border-0 bg-transparent' />
                        ) : responseBodyDisplay ? (
                          <pre className='max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-text'>
                            {responseBodyView === 'pretty' && response.isJson ? response.body : responseBodyDisplay}
                          </pre>
                        ) : (
                          <div className='rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-text-secondary'>Send a request to see the response here.</div>
                        )}
                      </div>
                    </>
                  )}

                  {responseTab === 'headers' && (
                    <div className='rounded-2xl border border-border bg-surface p-3 text-sm text-text'>
                      {response.headers.length > 0 ? response.headers.map(([name, value]) => (
                        <div key={`${name}:${value}`} className='break-words border-b border-border/40 py-1 last:border-0'><span className='font-medium text-text'>{name}</span>: {value}</div>
                      )) : <p className='text-text-secondary'>No response headers available yet.</p>}
                    </div>
                  )}

                  {responseTab === 'cookies' && (
                    <div className='space-y-2'>
                      {response.cookies.length > 0 ? response.cookies.map((cookie, index) => (
                        <div key={index} className='rounded-2xl border border-border bg-surface p-3 text-xs text-text'>{cookie}</div>
                      )) : <div className='rounded-2xl border border-dashed border-border bg-background/40 p-4 text-sm text-text-secondary'>No cookies detected in the current response.</div>}
                    </div>
                  )}

                  {responseTab === 'timeline' && (
                    <div className='grid gap-3 md:grid-cols-2'>
                      <div className='rounded-2xl border border-border bg-surface p-3'>
                        <div className='text-xs uppercase tracking-[0.2em] text-text-secondary'>Request</div>
                        <div className='mt-2 text-sm text-text'>{response.requestMethod || draft.method}</div>
                        <div className='mt-1 break-all text-xs text-text-secondary'>{response.requestUrl || draft.url}</div>
                      </div>
                      <div className='rounded-2xl border border-border bg-surface p-3'>
                        <div className='text-xs uppercase tracking-[0.2em] text-text-secondary'>Timing</div>
                        <div className='mt-2 text-sm text-text'>{response.durationMs ?? 0} ms</div>
                        <div className='mt-1 text-xs text-text-secondary'>{response.startedAt ? new Date(response.startedAt).toLocaleString() : 'Not sent yet'}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {false && <Card className='border-border bg-background/40 text-text shadow-2xl backdrop-blur-xl'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base text-text'>Quick Action</CardTitle>
                  <CardDescription className='text-text-secondary'>Everything here is actionable and stateful.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-sm text-text-secondary'>
                  <button type='button' className='flex w-full items-center justify-between rounded-2xl border border-border bg-background/40 px-3 py-3 text-left transition-colors hover:bg-background/60' onClick={saveCurrentRequest}>
                    <div>
                      <div className='font-medium text-text'>Save current request</div>
                      <div className='text-xs text-text-secondary'>Create or update a saved request.</div>
                    </div>
                    <ArrowRight className='h-4 w-4 text-text-secondary' />
                  </button>
                  <button type='button' className='flex w-full items-center justify-between rounded-2xl border border-border bg-background/40 px-3 py-3 text-left transition-colors hover:bg-background/60' onClick={createNewRequest}>
                    <div>
                      <div className='font-medium text-text'>Create manual request</div>
                      <div className='text-xs text-text-secondary'>Start a new editable request.</div>
                    </div>
                    <Plus className='h-4 w-4 text-text-secondary' />
                  </button>
                  <button type='button' className='flex w-full items-center justify-between rounded-2xl border border-border bg-background/40 px-3 py-3 text-left transition-colors hover:bg-background/60' onClick={() => fileInputRef.current?.click()}>
                    <div>
                      <div className='font-medium text-text'>Import API definition</div>
                      <div className='text-xs text-text-secondary'>OpenAPI, Swagger, Postman, Environment.</div>
                    </div>
                    <UploadCloud className='h-4 w-4 text-text-secondary' />
                  </button>
                  <div className='rounded-2xl border border-border bg-surface p-3'>
                    <div className='text-xs uppercase tracking-[0.2em] text-text-secondary'>Current request</div>
                    <div className='mt-2 text-sm font-medium text-text'>{currentRequestInfo[1]}</div>
                    <div className='mt-1 text-xs text-text-secondary'>{currentRequestInfo[0]}</div>
                    <div className='mt-1 break-all text-[11px] text-text-secondary'>{currentRequestInfo[2]}</div>
                  </div>
                </CardContent>
              </Card>}
            </div>

            <Card className='border-border bg-background/40 text-text shadow-2xl backdrop-blur-xl'>
              <CardHeader className='pb-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <CardTitle className='text-base text-text'>Context & Utilities</CardTitle>
                    <CardDescription className='text-text-secondary'>Quick access to related request assets.</CardDescription>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {BOTTOM_TABS.map((tab) => {
                      const Icon = tab.icon;
                      const active = bottomTab === tab.value;
                      return (
                        <button
                          key={tab.value}
                          type='button'
                          onClick={() => setBottomTab(tab.value)}
                          className={`rounded-xl px-3 py-2 text-xs transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:bg-background/40 hover:text-text'}`}
                        >
                          <Icon className='mr-2 inline h-3.5 w-3.5' />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {bottomTab === 'related' && (
                  <div className='grid gap-4 lg:grid-cols-3'>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Selected endpoint</div>
                      <div className='mt-1 text-xs text-text-secondary'>{selectedApiEndpoint?.name || draft.name}</div>
                      <div className='mt-2 text-xs text-text-secondary'>{selectedCollectionMeta?.name || 'Manual request'}</div>
                    </div>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Environment</div>
                      <div className='mt-1 text-xs text-text-secondary'>{activeEnvironment?.name || 'None selected'}</div>
                      <div className='mt-2 text-xs text-text-secondary'>{activeEnvironment ? `${Object.keys(activeEnvironment.variables).length} variables` : 'Import an environment file to enable variable resolution.'}</div>
                    </div>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Utility actions</div>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        <Button type='button' variant='outline' className='border-border bg-background/40 text-text' size='sm' onClick={clearImports}><RotateCcw className='mr-2 h-4 w-4' />Clear imports</Button>
                        <Button type='button' variant='outline' className='border-border bg-background/40 text-text' size='sm' onClick={saveCurrentRequest}><Save className='mr-2 h-4 w-4' />Save</Button>
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === 'tests' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Last test results</div>
                      <div className='mt-3 space-y-2'>
                        {response.tests.length > 0 ? response.tests.map((test, index) => (
                          <div key={index} className={`rounded-xl border px-3 py-2 text-sm ${test.passed ? 'border-emerald-400/20 bg-success/10 text-success' : 'border-error/20 bg-error/10 text-error'}`}>
                            {test.name} · {test.message || (test.passed ? 'Passed' : 'Failed')}
                          </div>
                        )) : <p className='text-sm text-text-secondary'>No tests run yet.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Test script</div>
                      <pre className='mt-3 max-h-64 overflow-auto rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-text whitespace-pre-wrap'>{draft.testScript || 'Add a test script in the Tests tab to validate responses.'}</pre>
                    </div>
                  </div>
                )}

                {bottomTab === 'environments' && (
                  <div className='grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]'>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Select environment</div>
                      <div className='mt-3 space-y-2'>
                        {environments.length > 0 ? environments.map((env) => (
                          <button
                            key={env.id}
                            type='button'
                            onClick={() => { void selectEnvironment(env.id); }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${activeEnvironmentId === env.id ? 'bg-primary/15 text-primary' : 'hover:bg-background/40 text-text'}`}
                          >
                            <span className='truncate'>{env.name}</span>
                            <Badge variant='outline' className='border-border bg-background/40 text-text'>{Object.keys(env.variables).length}</Badge>
                          </button>
                        )) : <p className='text-sm text-text-secondary'>Import env files to see them here.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Variables</div>
                      <div className='mt-3'>
                        {activeEnvironment ? (
                          <JsonViewer data={activeEnvironment.variables} className='border-0 bg-transparent' />
                        ) : (
                          <p className='text-sm text-text-secondary'>No active environment selected.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === 'mock' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Mock servers</div>
                      <div className='mt-3 space-y-2 text-sm text-text-secondary'>
                        {apiCollections.length > 0 ? apiCollections.slice(0, 5).map((collection) => (
                          <div key={collection.id} className='rounded-xl border border-border bg-background/40 p-3'>
                            <div className='font-medium text-text'>{collection.name}</div>
                            <div className='mt-1 text-xs text-text-secondary'>{collection.endpoints.length} endpoints</div>
                          </div>
                        )) : <p>No imported API definitions yet.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>OpenAPI / Postman source</div>
                      <pre className='mt-3 max-h-64 overflow-auto rounded-xl border border-border/60 bg-background/70 p-3 text-xs text-text whitespace-pre-wrap'>
                        {selectedApiEndpoint ? stringifyJson(selectedApiEndpoint.raw) : 'Select an imported API endpoint to inspect its raw source.'}
                      </pre>
                    </div>
                  </div>
                )}

                {bottomTab === 'documentation' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Imported documents</div>
                      <div className='mt-3 space-y-2'>
                        {importedArtifacts.map((artifact) => (
                          <div key={artifact.id} className='rounded-xl border border-border bg-background/40 p-3'>
                            <div className='flex items-center gap-2'>
                              <Badge variant='outline' className='border-border bg-background/40 text-text'>{artifact.kind.toUpperCase()}</Badge>
                              <div className='font-medium text-text'>{artifact.name}</div>
                            </div>
                            <div className='mt-1 text-xs text-text-secondary'>{artifact.summary}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Reference viewer</div>
                      <div className='mt-3'>
                        {selectedApiEndpoint?.raw ? <JsonViewer data={selectedApiEndpoint.raw} className='border-0 bg-transparent' /> : <p className='text-sm text-text-secondary'>Select an endpoint to inspect its documentation metadata.</p>}
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === 'activity' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Recent activity</div>
                      <div className='mt-3 space-y-2'>
                        {history.length > 0 ? history.map((item) => (
                          <button key={item.id} type='button' onClick={() => {
                            setActiveRequestLog(`Reopened ${item.requestName}`);
                            setDraft((current) => ({ ...current, name: item.requestName, method: item.method, url: item.url }));
                          }} className='flex w-full items-center justify-between rounded-xl border border-border bg-background/40 px-3 py-2 text-left transition-colors hover:bg-background/60'>
                            <div>
                              <div className='font-medium text-text'>{item.requestName}</div>
                              <div className='text-xs text-text-secondary'>{item.method} · {item.status ?? 'n/a'}</div>
                            </div>
                            <Clock3 className='h-4 w-4 text-text-secondary' />
                          </button>
                        )) : <p className='text-sm text-text-secondary'>No activity yet.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-border bg-surface p-3'>
                      <div className='text-sm font-medium text-text'>Current status</div>
                      <div className='mt-3 rounded-xl border border-border bg-background/40 p-3 text-sm text-text-secondary'>{activeRequestLog}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {environmentManagerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm' role='dialog' aria-modal='true' aria-label='Manage environments'>
          <div className='flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface p-5 text-text shadow-2xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-lg font-semibold'>Manage environments</h2>
                <p className='mt-1 text-sm text-text-secondary'>Create, import, edit, activate, or delete environments without leaving the API workspace.</p>
              </div>
              <button type='button' className='rounded-lg p-2 text-text-secondary hover:bg-background/60 hover:text-text' onClick={() => setEnvironmentManagerOpen(false)} aria-label='Close environment manager'>
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='mt-5 flex flex-wrap gap-2'>
              <input value={environmentSearch} onChange={(event) => setEnvironmentSearch(event.target.value)} className='h-10 min-w-[220px] flex-1 rounded-xl border border-border bg-background/80 px-3 text-sm text-text outline-none' placeholder='Search environments' />
              <Button type='button' variant='outline' className='border-border bg-background/40 text-text' onClick={() => { setEnvironmentEditorTarget(undefined); setEnvironmentEditorOpen(true); }}>
                <Plus className='mr-2 h-4 w-4' /> New
              </Button>
              <Button type='button' variant='outline' className='border-border bg-background/40 text-text' onClick={() => setEnvironmentImportOpen(true)}>
                <UploadCloud className='mr-2 h-4 w-4' /> Import
              </Button>
            </div>
            <div className='mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
              {managedEnvironmentList.length > 0 ? managedEnvironmentList.map((environment) => (
                <div key={environment.id} className={`rounded-2xl border p-4 ${activeEnvironmentId === environment.id ? 'border-violet-400/50 bg-violet-400/10' : 'border-border bg-background/40'}`}>
                  <div className='flex items-start justify-between gap-3'>
                    <button type='button' className='min-w-0 flex-1 text-left' onClick={() => { void selectEnvironment(environment.id); }}>
                      <div className='flex items-center gap-2'>
                        <span className='truncate font-medium'>{environment.name}</span>
                        {activeEnvironmentId === environment.id && <Badge variant='outline' className='border-success/30 bg-success/10 text-success'>Active</Badge>}
                      </div>
                      <p className='mt-1 truncate text-xs text-text-secondary'>{environment.baseUrl || 'No base URL set'}</p>
                      <p className='mt-2 text-xs text-text-secondary'>{Object.keys(environment.variables || {}).length} variables</p>
                    </button>
                    <div className='flex shrink-0 gap-2'>
                      <Button type='button' variant='outline' size='sm' className='border-border bg-background/40 text-text' onClick={() => { setEnvironmentEditorTarget(environment); setEnvironmentEditorOpen(true); }}>Edit</Button>
                      <Button type='button' variant='outline' size='sm' className='border-error/30 bg-error/10 text-error' onClick={() => requestDeleteManagedEnvironment(environment)} disabled={environmentActionBusy}><Trash2 className='h-4 w-4' /></Button>
                    </div>
                  </div>
                </div>
              )) : <div className='rounded-2xl border border-dashed border-border p-8 text-center text-sm text-text-secondary'>No managed environments found.</div>}
            </div>
          </div>
        </div>
      )}
      <EnvironmentDialog
        open={environmentEditorOpen}
        onClose={() => setEnvironmentEditorOpen(false)}
        onSubmit={(data) => void handleEnvironmentSubmit(data)}
        isSubmitting={environmentActionBusy}
        environment={environmentEditorTarget ? {
          id: environmentEditorTarget.id,
          projectId,
          name: environmentEditorTarget.name,
          baseUrl: environmentEditorTarget.baseUrl,
          description: environmentEditorTarget.description || '',
          authentication: environmentEditorTarget.authentication as EnvironmentDialogData['authentication'],
          variables: environmentEditorTarget.variables || {},
          timeout: environmentEditorTarget.timeout || 30000,
        } : undefined}
      />
      <ConfirmDialog
        open={Boolean(environmentDeleteTarget)}
        title='Delete environment?'
        message={environmentDeleteTarget ? `Delete environment "${environmentDeleteTarget.name}"? This removes its variables and OAuth token configuration.` : ''}
        confirmLabel='Delete environment'
        cancelLabel='Keep environment'
        variant='destructive'
        isLoading={environmentActionBusy}
        onConfirm={() => void deleteManagedEnvironment()}
        onCancel={() => {
          if (!environmentActionBusy) setEnvironmentDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        open={apiDeleteConfirmOpen}
        title='Delete imported APIs?'
        message='This removes all imported API contracts and their operations from this project. This action cannot be undone.'
        confirmLabel='Delete APIs'
        cancelLabel='Keep APIs'
        variant='destructive'
        onConfirm={deleteImportedApis}
        onCancel={() => setApiDeleteConfirmOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(endpointDeleteTarget)}
        title='Delete endpoint?'
        message={endpointDeleteTarget ? `Delete "${endpointDeleteTarget.endpoint.name}" from ${endpointDeleteTarget.collection.name}? This removes the endpoint from the imported API.` : ''}
        confirmLabel='Delete endpoint'
        cancelLabel='Keep endpoint'
        variant='destructive'
        isLoading={endpointDeleteBusy}
        onConfirm={() => void deleteImportedEndpoint()}
        onCancel={() => {
          if (!endpointDeleteBusy) setEndpointDeleteTarget(null);
        }}
      />
      {/* Individual API sends execute directly. Keep the preview implementation
          out of the rendered workflow until a less disruptive UX is designed.
      <EntityDialog
        open={dataPreviewOpen}
        title='Data Preview'
        description='Review the canonical execution data before sending. Sensitive values are always masked.'
        submitLabel={dataPreview?.canExecute ? 'Send request' : 'Resolve required inputs'}
        onClose={() => setDataPreviewOpen(false)}
        onSubmit={(event) => { event.preventDefault(); if (!dataPreview?.canExecute) return; setDataPreviewOpen(false); void executeRequest(previewOverrides); }}
      >
        <div className='space-y-2'>
          {(dataPreview?.inputs || []).map((item: any) => {
            const inputKey = `${item.input?.operationId}|${item.input?.location}|${item.input?.path}`;
            return <div key={`${item.input?.location}-${item.input?.path}`} className='rounded-lg border border-border bg-background/40 p-3 text-sm'>
              <div className='flex justify-between gap-3'><span className='font-medium text-text'>{item.input?.path}</span><Badge variant={item.required ? 'secondary' : 'outline'}>{item.required ? 'Required' : item.value === 'OMIT' ? 'Optional · omitted' : 'Optional'}</Badge></div>
              <p className='mt-1 text-text-secondary'>Final value: {item.displayValue === undefined ? 'Unresolved' : String(item.displayValue)}</p>
              <p className='text-xs text-text-secondary'>Source: {previewSourceLabel(item.sourceStrategy, item.scope)} · {previewScopeLabel(item.scope)}</p>
              {!item.sensitive && <div className='mt-2 space-y-2'>
                <div className='flex gap-2'><input aria-label={`Temporary override ${item.input?.path}`} value={previewOverrides[inputKey] || ''} onChange={(event) => setPreviewOverrides((current) => ({ ...current, [inputKey]: event.target.value }))} placeholder='Temporary change for this request' className='h-8 flex-1 rounded border border-border bg-background px-2 text-xs text-text' /><Button size='sm' variant='outline' onClick={() => void openDataPreview({ ...previewOverrides, [inputKey]: previewOverrides[inputKey] || '' })}>Apply temporarily</Button></div>
                <div className='flex flex-wrap items-center gap-2'><select aria-label={`Saved strategy ${item.input?.path}`} value={previewSaveStrategies[inputKey] || 'FIXED'} onChange={(event) => setPreviewSaveStrategies((current) => ({ ...current, [inputKey]: event.target.value }))} className='h-8 rounded border border-border bg-background px-2 text-xs text-text'>{['FIXED', 'GENERATE', 'REUSE', 'LINKED_RESPONSE', 'DATASET', 'ENVIRONMENT', 'SECRET', 'MANUAL', 'CONTRACT_DEFAULT'].map((strategy) => <option key={strategy} value={strategy}>{strategy}</option>)}</select><input aria-label={`Saved source ${item.input?.path}`} value={previewSaveSources[inputKey] || ''} onChange={(event) => setPreviewSaveSources((current) => ({ ...current, [inputKey]: event.target.value }))} placeholder='Source/reference (if needed)' className='h-8 min-w-40 rounded border border-border bg-background px-2 text-xs text-text' /><span className='text-xs text-text-secondary'>Save as:</span><Button size='sm' variant='ghost' onClick={() => void savePreviewValue(item, 'TEST_CASE')}>This TestCase</Button><Button size='sm' variant='ghost' onClick={() => void savePreviewValue(item, 'OPERATION')}>This operation</Button><Button size='sm' variant='ghost' onClick={() => void savePreviewValue(item, 'PROJECT')}>Project default</Button></div>
              </div>}
              {item.sensitive && <p className='mt-2 text-xs text-text-secondary'>Sensitive values are masked and cannot be overridden or saved here.</p>}
              {item.unresolvedReason && <div className='mt-1 flex items-center justify-between gap-2'><p className='text-xs text-error'>{item.unresolvedReason}</p><a className='text-xs text-primary underline' href={`/projects/${projectId}/test-data?operationId=${encodeURIComponent(item.input?.operationId || '')}&input=${encodeURIComponent(item.input?.path || '')}`}>Configure Test Data</a></div>}
              <details className='mt-2 text-xs text-text-secondary'><summary className='cursor-pointer text-primary'>View details</summary><p className='mt-1'>Location: {item.input?.location || 'Unknown'} · Rule: {item.sourceStrategy || 'Unresolved'} · Lifecycle: {item.lifecycle || 'Not set'}</p></details>
            </div>;
          })}
          <label className='block text-xs text-text-secondary'>Exact TestCase version ID (only required for “This TestCase”)<input aria-label='Exact TestCase version ID' value={previewTestCaseVersionId} onChange={(event) => setPreviewTestCaseVersionId(event.target.value)} className='mt-1 h-8 w-full rounded border border-border bg-background px-2 text-xs text-text' /></label>
          {previewSaveStatus && <p className='text-xs text-text-secondary'>{previewSaveStatus}</p>}
          {dataPreview?.unresolvedRequired > 0 && <p className='text-sm text-error'>Required inputs are unresolved. Configure their Data Rules before sending.</p>}
        </div>
      </EntityDialog> */}
      <EntityDialog
        open={apiImportFiles.length > 0}
        title='Review API import'
        description='Confirm the files below before they are parsed and added to this project.'
        submitLabel='Import files'
        isLoading={apiImportBusy}
        size='md'
        onClose={() => {
          if (!apiImportBusy) setApiImportFiles([]);
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void importApiFiles(apiImportFiles);
        }}
      >
        <div className='space-y-2'>
          <p className='text-xs font-medium uppercase tracking-wide text-text-secondary'>
            {apiImportFiles.length} file{apiImportFiles.length === 1 ? '' : 's'} selected
          </p>
          <div className='max-h-64 overflow-y-auto rounded-xl border border-border bg-background/40 p-2'>
            {apiImportFiles.map((file) => (
              <div key={`${file.name}-${file.lastModified}`} className='flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-text hover:bg-surface'>
                <span className='truncate'>{file.name}</span>
                <span className='shrink-0 text-xs text-text-secondary'>{Math.max(1, Math.ceil(file.size / 1024))} KB</span>
              </div>
            ))}
          </div>
        </div>
      </EntityDialog>
      <ImportEnvironmentModal open={environmentImportOpen} onClose={() => setEnvironmentImportOpen(false)} onImport={(data) => void handleEnvironmentImport(data)} isImporting={environmentActionBusy} />
    </div>
  );
};

export default ApiExecutionPage;
