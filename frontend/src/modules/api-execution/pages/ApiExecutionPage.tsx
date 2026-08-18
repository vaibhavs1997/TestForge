import React from 'react';
import { useParams } from 'react-router-dom';
import { projectStore } from '../../../store/projectStore';
import { useEnvironments } from '../../environment/hooks/useEnvironments';
import { environmentService } from '../../environment/services/environmentService';
import { EnvironmentDialog, type EnvironmentDialogData } from '../../environment/components/EnvironmentDialog';
import { ImportEnvironmentModal, type ImportEnvironmentModalData } from '../../environment/components/ImportEnvironmentModal';
import { parseEnvironmentImport } from '../../environment/utils/parseEnvironmentImport';
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
import { datasetService } from '../../test-data/services/datasetService';
import { rowService } from '../../test-data/services/rowService';
import type { DatasetDto } from '../../../types/moduleContracts';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type BodyMode = 'none' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary' | 'graphql';
type RawBodyType = 'json' | 'text' | 'xml' | 'html' | 'javascript';
type AuthType = 'none' | 'bearer' | 'basic' | 'apiKey' | 'oauth2';
type ResponseTab = 'response' | 'headers' | 'cookies' | 'timeline';
type ResponseBodyView = 'pretty' | 'raw' | 'preview';
type BottomTab = 'related' | 'tests' | 'environments' | 'mock' | 'documentation' | 'activity';
type ImportedKind = 'api' | 'env' | 'unknown';
type SelectionKind = 'api-endpoint' | 'manual' | 'saved' | null;

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

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
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

const STORAGE_SCOPE_PREFIX = 'testforge:api-workspace';

function makeId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getScope(projectId?: string): string {
  return projectId?.trim() ? `project:${projectId.trim()}` : 'project:global';
}

function storageKey(projectId: string | undefined, suffix: string): string {
  return `${STORAGE_SCOPE_PREFIX}:${suffix}:${getScope(projectId)}`;
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

function resolveUrl(url: string, pathParams: Record<string, string>, queryParams: Record<string, string>, env: Record<string, string>): string {
  const withEnv = replaceTemplateVariables(url, env);
  const withPath = applyPathParameters(withEnv, pathParams);
  return appendQueryString(withPath, queryParams);
}

function rowsToRecord(rows: KeyValueRow[]): Record<string, string> {
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

function requestHeadersToRecord(rows: HeaderRow[]): Record<string, string> {
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

function createScriptHelpers(draft: RequestDraft) {
  const logLines: string[] = [];
  return {
    logLines,
    helpers: {
      setUrl(value: string) {
        draft.url = String(value);
      },
      setHeader(name: string, value: string) {
        const next = String(name).trim();
        if (!next) return;
        const current = draft.headers.find((row) => row.name.trim().toLowerCase() === next.toLowerCase());
        if (current) current.value = String(value);
        else draft.headers.push(createHeaderRow(next, String(value)));
      },
      setQueryParam(name: string, value: string) {
        const next = String(name).trim();
        if (!next) return;
        const current = draft.queryParams.find((row) => row.key.trim().toLowerCase() === next.toLowerCase());
        if (current) current.value = String(value);
        else draft.queryParams.push(createIdRow(next, String(value)));
      },
      setPathParam(name: string, value: string) {
        const next = String(name).trim();
        if (!next) return;
        const current = draft.pathParams.find((row) => row.key.trim().toLowerCase() === next.toLowerCase());
        if (current) current.value = String(value);
        else draft.pathParams.push(createIdRow(next, String(value)));
      },
      setBody(value: string) {
        draft.rawBody = String(value);
      },
      setAuthType(value: AuthType) {
        draft.auth.type = value;
      },
      log(...args: unknown[]) {
        logLines.push(args.map((arg) => String(arg)).join(' '));
      },
    },
  };
}

function runUserScript(script: string, context: Record<string, unknown>): { ok: boolean; error?: string } {
  if (!script.trim()) return { ok: true };
  try {
    const fn = new Function('context', `with (context) { ${script} }`);
    fn(context);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Script execution failed' };
  }
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
  const entries: EnvLine[] = Object.entries(environment.variables || {}).map(([key, value]) => ({
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
    summary: `${Object.keys(environment.variables || {}).length} variables managed by Environment page`,
    entries,
    variables: environment.variables || {},
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

function persistedImportedArtifact(artifact: ImportedArtifact): unknown {
  if (artifact.kind === 'api') {
    return {
      ...artifact,
      endpoints: artifact.endpoints.map((endpoint) => ({
        ...endpoint,
        requestTemplate: sanitizeDraftForStorage(endpoint.requestTemplate),
      })),
    };
  }
  return artifact;
}

function hydrateImportedArtifact(artifact: ImportedArtifact): ImportedArtifact {
  if (artifact.kind === 'api') {
    return {
      ...artifact,
      endpoints: artifact.endpoints.map((endpoint) => ({
        ...endpoint,
        requestTemplate: {
          ...createDraft(),
          ...endpoint.requestTemplate,
          binaryFile: null,
          settings: { ...createDefaultSettings(), ...endpoint.requestTemplate.settings },
          auth: { ...createDefaultAuth(), ...endpoint.requestTemplate.auth },
        },
      })),
    };
  }
  return artifact;
}

function formatResponseBody(text: string): { body: string; isJson: boolean } {
  const trimmed = text.trim();
  if (!trimmed) return { body: '', isJson: false };
  try {
    return { body: JSON.stringify(JSON.parse(trimmed), null, 2), isJson: true };
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
    return auth.bearerToken.trim() ? { headers: { Authorization: `Bearer ${auth.bearerToken.trim()}` }, query: {} } : { headers: {}, query: {} };
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
    return auth.oauth2Token.trim() ? { headers: { Authorization: `Bearer ${auth.oauth2Token.trim()}` }, query: {} } : { headers: {}, query: {} };
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
  const { environments: managedEnvironments = [], updateAsync: updateManagedEnvironment } = useEnvironments(projectId);
  const importedKey = React.useMemo(() => storageKey(projectId, 'imports'), [projectId]);
  const manualKey = React.useMemo(() => storageKey(projectId, 'manuals'), [projectId]);
  const savedKey = React.useMemo(() => storageKey(projectId, 'saved'), [projectId]);
  const envSelectionKey = React.useMemo(() => storageKey(projectId, 'environment'), [projectId]);
  const selectionKey = React.useMemo(() => storageKey(projectId, 'selection'), [projectId]);
  const responsesKey = React.useMemo(() => storageKey(projectId, 'responses'), [projectId]);
  const draftsKey = React.useMemo(() => storageKey(projectId, 'drafts'), [projectId]);
  const historyKey = React.useMemo(() => storageKey(projectId, 'history'), [projectId]);
  const runtimeDataKeyStorage = React.useMemo(() => storageKey(projectId, 'runtime-data'), [projectId]);

  const [searchTerm, setSearchTerm] = React.useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const binaryFileInputRef = React.useRef<HTMLInputElement>(null);
  const requestWorkspaceRef = React.useRef<HTMLDivElement>(null);
  const responsePanelRef = React.useRef<HTMLDivElement>(null);
  const saveConfirmationTimerRef = React.useRef<number | null>(null);
  const managedEnvironmentIdsRef = React.useRef<Set<string>>(new Set());

  const [importedArtifacts, setImportedArtifacts] = React.useState<ImportedArtifact[]>([]);
  const [manualRequests, setManualRequests] = React.useState<ManualRequestRecord[]>([]);
  const [savedRequests, setSavedRequests] = React.useState<SavedRequestRecord[]>([]);
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
  const [expandedCollections, setExpandedCollections] = React.useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({});
  const [activeRequestLog, setActiveRequestLog] = React.useState<string>('Ready to send');
  const [lastScriptOutput, setLastScriptOutput] = React.useState<string[]>([]);
  const [lastHydrated, setLastHydrated] = React.useState(false);
  const [explorerHeight, setExplorerHeight] = React.useState<number | null>(null);
  const [tokenNow, setTokenNow] = React.useState(() => Date.now());
  const [saveConfirmation, setSaveConfirmation] = React.useState('');
  const [environmentManagerOpen, setEnvironmentManagerOpen] = React.useState(false);
  const [environmentEditorOpen, setEnvironmentEditorOpen] = React.useState(false);
  const [environmentImportOpen, setEnvironmentImportOpen] = React.useState(false);
  const [environmentEditorTarget, setEnvironmentEditorTarget] = React.useState<EnvironmentDto | undefined>();
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
    try {
      const rawImports = localStorage.getItem(importedKey);
      const rawManuals = localStorage.getItem(manualKey);
      const rawSaved = localStorage.getItem(savedKey);
      const rawHistory = localStorage.getItem(historyKey);
      const rawEnv = localStorage.getItem(envSelectionKey);
      const rawSelection = localStorage.getItem(selectionKey);
      const rawResponses = localStorage.getItem(responsesKey);
      const rawDrafts = localStorage.getItem(draftsKey);
      const rawRuntimeData = localStorage.getItem(runtimeDataKeyStorage);
      const parsedImports = rawImports ? (JSON.parse(rawImports) as ImportedArtifact[]) : [];
      const parsedManuals = rawManuals ? (JSON.parse(rawManuals) as ManualRequestRecord[]) : [];
      const parsedSaved = rawSaved ? (JSON.parse(rawSaved) as SavedRequestRecord[]) : [];
      const parsedHistory = rawHistory ? (JSON.parse(rawHistory) as HistoryRecord[]) : [];
      const parsedSelection = rawSelection ? (JSON.parse(rawSelection) as SelectionState | null) : null;
      const parsedResponses = rawResponses ? (JSON.parse(rawResponses) as Record<string, ResponseState>) : {};
      const parsedDrafts = rawDrafts ? (JSON.parse(rawDrafts) as Record<string, PersistedRequestDraft>) : {};
      const parsedRuntimeData = rawRuntimeData ? (JSON.parse(rawRuntimeData) as RuntimeDataCache) : {};

      const hydratedImports = parsedImports.map(hydrateImportedArtifact);
      const hydratedManuals = parsedManuals.map((item) => ({
        ...item,
        draft: { ...createDraft(), ...item.draft, binaryFile: null, settings: { ...createDefaultSettings(), ...item.draft.settings }, auth: { ...createDefaultAuth(), ...item.draft.auth } },
      }));
      const hydratedSaved = parsedSaved.map((item) => ({
        ...item,
        draft: { ...createDraft(), ...item.draft, binaryFile: null, settings: { ...createDefaultSettings(), ...item.draft.settings }, auth: { ...createDefaultAuth(), ...item.draft.auth } },
      }));

      setImportedArtifacts(hydratedImports);
      setManualRequests(hydratedManuals);
      setSavedRequests(hydratedSaved);
      setHistory(parsedHistory);
      setResponseCache(parsedResponses);
      setDraftCache(parsedDrafts);
      setRuntimeData(parsedRuntimeData);
      setActiveEnvironmentId(rawEnv || '');

      const firstCollection = hydratedImports.find((item) => item.kind === 'api') as ImportedApiCollection | undefined;
      const firstEndpoint = firstCollection?.endpoints[0];
      const firstManual = hydratedManuals[0];
      const restoredApi = parsedSelection?.kind === 'api-endpoint'
        ? hydratedImports
            .filter((item): item is ImportedApiCollection => item.kind === 'api')
            .find((collection) => collection.id === parsedSelection.collectionId)?.endpoints.find((endpoint) => endpoint.id === parsedSelection.endpointId)
        : null;
      const restoredManual = parsedSelection?.kind === 'manual' ? hydratedManuals.find((item) => item.id === parsedSelection.id) : null;
      const restoredSaved = parsedSelection?.kind === 'saved' ? hydratedSaved.find((item) => item.id === parsedSelection.id) : null;
      if (restoredApi && parsedSelection?.kind === 'api-endpoint') {
        setSelection(parsedSelection);
        setDraft(cloneJson(restoredApi.requestTemplate));
      } else if (restoredManual && parsedSelection?.kind === 'manual') {
        setSelection(parsedSelection);
        setDraft(cloneJson(restoredManual.draft));
      } else if (restoredSaved && parsedSelection?.kind === 'saved') {
        setSelection(parsedSelection);
        setDraft(cloneJson(restoredSaved.draft));
      } else if (firstEndpoint) {
        const fallbackSelection = { kind: 'api-endpoint' as const, id: firstEndpoint.id, collectionId: firstCollection.id, endpointId: firstEndpoint.id };
        setSelection(fallbackSelection);
        setDraft(cloneJson(firstEndpoint.requestTemplate));
      } else if (firstManual) {
        setSelection({ kind: 'manual', id: firstManual.id });
        setDraft(cloneJson(firstManual.draft));
      } else if (hydratedSaved[0]) {
        setSelection({ kind: 'saved', id: hydratedSaved[0].id });
        setDraft(cloneJson(hydratedSaved[0].draft));
      } else {
        setSelection(null);
        setDraft(createDraft());
      }

      setLastHydrated(true);
    } catch {
      setImportedArtifacts([]);
      setManualRequests([]);
      setSavedRequests([]);
      setHistory([]);
      setSelection(null);
      setDraft(createDraft());
      setActiveEnvironmentId('');
      setLastHydrated(true);
    }
  }, [importedKey, manualKey, savedKey, historyKey, envSelectionKey, selectionKey, responsesKey, draftsKey, runtimeDataKeyStorage]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(importedKey, JSON.stringify(importedArtifacts.map(persistedImportedArtifact)));
  }, [importedArtifacts, importedKey, lastHydrated]);

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

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(manualKey, JSON.stringify(manualRequests.map((item) => ({ ...item, draft: sanitizeDraftForStorage(item.draft) }))));
  }, [manualRequests, manualKey, lastHydrated]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(savedKey, JSON.stringify(savedRequests.map((item) => ({ ...item, draft: sanitizeDraftForStorage(item.draft) }))));
  }, [savedRequests, savedKey, lastHydrated]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(historyKey, JSON.stringify(history));
  }, [history, historyKey, lastHydrated]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(envSelectionKey, activeEnvironmentId);
  }, [activeEnvironmentId, envSelectionKey, lastHydrated]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(selectionKey, JSON.stringify(selection));
  }, [selection, selectionKey, lastHydrated]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(responsesKey, JSON.stringify(responseCache));
  }, [responseCache, responsesKey, lastHydrated]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(draftsKey, JSON.stringify(draftCache));
  }, [draftCache, draftsKey, lastHydrated]);

  React.useEffect(() => {
    if (!lastHydrated) return;
    localStorage.setItem(runtimeDataKeyStorage, JSON.stringify(runtimeData));
  }, [runtimeData, runtimeDataKeyStorage, lastHydrated]);

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
    () => importedArtifacts.filter((item): item is ImportedEnvironment => item.kind === 'env'),
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

  React.useEffect(() => {
    if (selection?.kind === 'manual') {
      const record = manualRequests.find((item) => item.id === selection.id);
      if (record) setDraft(cloneJson(record.draft));
    }
    if (selection?.kind === 'saved') {
      const record = savedRequests.find((item) => item.id === selection.id);
      if (record) setDraft(cloneJson(record.draft));
    }
  }, [selection, manualRequests, savedRequests]);

  React.useEffect(() => {
    if (!selection || selection.kind !== 'manual') return;
    setManualRequests((current) =>
      current.map((item) => (item.id === selection.id ? { ...item, draft: sanitizeDraftForStorage(draft), updatedAt: Date.now() } : item)),
    );
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

  const saveCurrentRequest = () => {
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
      setActiveRequestLog(confirmation);
      return;
    }

    if (selection?.kind === 'manual') {
      setManualRequests((current) =>
        current.map((item) => (item.id === selection.id ? { ...item, draft: persisted, updatedAt: now } : item)),
      );
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
    if (importedArtifacts.filter((item) => item.kind === 'api').length === 0) return;
    if (!window.confirm('Delete all imported API contracts from this project?')) return;
    setImportedArtifacts((current) => current.filter((item) => item.kind !== 'api'));
    if (selection?.kind === 'api-endpoint') {
      setSelection(null);
      setDraft(createDraft());
      setResponse(emptyResponseState());
    }
    setActiveRequestLog('Deleted imported API contracts');
  };

  const captureOAuthToken = (responseState: ResponseState) => {
    if (!activeEnvironmentId || !responseState.isJson) return;
    const payload = parseJsonSafely(responseState.body);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
    const tokenPayload = payload as Record<string, unknown>;
    const accessToken = String(tokenPayload.access_token || tokenPayload.accessToken || '').trim();
    if (!accessToken) return;
    const expiresIn = Number(tokenPayload.expires_in || 0);
    const activeEnvironmentArtifact = importedArtifacts.find((artifact): artifact is ImportedEnvironment => artifact.kind === 'env' && artifact.id === activeEnvironmentId);
    const hasSnakeCaseToken = Boolean(activeEnvironmentArtifact && Object.prototype.hasOwnProperty.call(activeEnvironmentArtifact.variables, 'access_token'));
    const tokenKey = hasSnakeCaseToken ? 'access_token' : 'accessToken';
    const syncedVariables: Record<string, string> = {
      ...(activeEnvironmentArtifact?.variables || {}),
      [tokenKey]: accessToken,
      accessToken,
      ...(expiresIn > 0 ? { tokenExpiresAt: String(Date.now() + expiresIn * 1000) } : {}),
    };

    setImportedArtifacts((current) => current.map((artifact) => {
      if (artifact.kind !== 'env' || artifact.id !== activeEnvironmentId) return artifact;
      const entries: EnvLine[] = artifact.entries.some((entry) => entry.kind === 'pair' && entry.key === tokenKey)
        ? artifact.entries.map((entry) => entry.kind === 'pair' && (entry.key === tokenKey || entry.key === 'accessToken')
          ? { ...entry, value: accessToken, raw: `${entry.key}=${accessToken}` }
          : entry)
        : [...artifact.entries, { kind: 'pair', key: tokenKey, value: accessToken, raw: `${tokenKey}=${accessToken}` }];
      if (!entries.some((entry) => entry.kind === 'pair' && entry.key === 'accessToken')) {
        entries.push({ kind: 'pair', key: 'accessToken', value: accessToken, raw: `accessToken=${accessToken}` });
      }
      return { ...artifact, variables: syncedVariables, entries, summary: `${Object.keys(syncedVariables).length} variables, OAuth token captured` };
    }));
    if (activeEnvironmentArtifact) {
      void updateManagedEnvironment(activeEnvironmentId, { variables: syncedVariables });
    }
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
      setEnvironmentImportOpen(false);
      setActiveRequestLog(`Synchronized ${result.environments.length} environment${result.environments.length === 1 ? '' : 's'}`);
    } finally {
      setEnvironmentActionBusy(false);
    }
  };

  const deleteManagedEnvironment = async (environment: EnvironmentDto) => {
    if (!window.confirm(`Delete environment "${environment.name}"?`)) return;
    setEnvironmentActionBusy(true);
    try {
      await environmentService.deleteEnvironment(projectId, environment.id);
      if (activeEnvironmentId === environment.id) setActiveEnvironmentId('');
      setActiveRequestLog(`Deleted environment ${environment.name}`);
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

  const executeRequest = async () => {
    setLoading(true);
    setResponse(emptyResponseState());
    setActiveRequestLog(`Sending ${draft.method} ${draft.url}`);

    const workingDraft = cloneJson(draft);
    const environmentVariables = currentEnvironmentVariables;
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

    const scriptHelpers = createScriptHelpers(workingDraft);
    const preContext = {
      request: workingDraft,
      environment: environmentVariables,
      helpers: scriptHelpers.helpers,
      console: { log: (...args: unknown[]) => scriptHelpers.logLines.push(args.map((value) => String(value)).join(' ')) },
    };
    const preResult = runUserScript(workingDraft.preRequestScript, preContext);
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
        const testResults = runTestsOnResponse(workingDraft, responseState);
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
      const testResults = runTestsOnResponse(workingDraft, responseState);
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

  function runTestsOnResponse(currentDraft: RequestDraft, responseState: ResponseState): TestResult[] {
    const results: TestResult[] = [];
    const testContext = {
      request: currentDraft,
      response: responseState,
      assert(condition: unknown, name: string) {
        results.push({
          name,
          passed: Boolean(condition),
          message: Boolean(condition) ? 'Passed' : 'Assertion failed',
        });
      },
      test(name: string, fn: () => void) {
        try {
          fn();
          results.push({ name, passed: true, message: 'Passed' });
        } catch (error) {
          results.push({ name, passed: false, message: error instanceof Error ? error.message : 'Test failed' });
        }
      },
      console: { log: () => undefined },
    };
    const result = runUserScript(currentDraft.testScript, testContext);
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
    <div className='relative min-h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-sm text-text'>
      <div className='pointer-events-none absolute inset-0 opacity-60'>
        <div className='absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl' />
        <div className='absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl' />
        <div className='absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl' />
      </div>

      <div className='relative mx-auto max-w-[1600px] px-4 pb-5 sm:px-6 lg:px-8' style={{ paddingTop: '24px' }}>
        <div className='mb-4 p-0'>
          <div className='relative z-10 flex justify-end'>
            <div className='flex flex-wrap items-center justify-end gap-3'>
              <Button type='button' variant='outline' className='h-11 w-44 border-white/15 bg-white/5 px-4 text-sm font-medium text-white' onClick={() => fileInputRef.current?.click()}>
                <UploadCloud className='mr-2 h-4 w-4' />
                Import API
              </Button>
              <Button type='button' variant='outline' className='h-11 w-44 border-white/15 bg-white/5 px-4 text-sm font-medium text-white' onClick={createNewRequest}>
                <Plus className='mr-2 h-4 w-4' />
                New Request
              </Button>
              <select
                value={activeEnvironmentId}
                onChange={(event) => setActiveEnvironmentId(event.target.value)}
                className='h-11 w-44 rounded-lg border border-violet-400/30 bg-violet-400/10 px-4 text-sm font-medium text-violet-100 outline-none focus:border-violet-300/60'
                aria-label='Select environment'
                title='Select environment for request execution'
              >
                <option value='' className='bg-slate-900 text-white'>No environment</option>
                {environments.map((environment) => (
                  <option key={environment.id} value={environment.id} className='bg-slate-900 text-white'>
                    {environment.name}
                  </option>
                ))}
              </select>
              <Button type='button' variant='outline' className='h-11 border-white/15 bg-white/5 px-4 text-sm font-medium text-white' onClick={() => setEnvironmentManagerOpen(true)}>
                <Settings2 className='mr-2 h-4 w-4' />
                Manage environments
              </Button>
              <Button type='button' variant='outline' className='h-11 w-44 border-red-400/30 bg-red-400/10 px-4 text-sm font-medium text-red-100 hover:bg-red-400/20' onClick={deleteImportedApis} disabled={importedArtifacts.filter((item) => item.kind === 'api').length === 0}>
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
            onChange={async (event) => {
              const files = event.target.files;
              if (!files?.length) return;
              const imported = await Promise.all(Array.from(files).map((file) => parseImportedFile(file)));
              const collections = imported.filter((item): item is ImportedApiCollection => item.kind === 'api');
              const envs = imported.filter((item): item is ImportedEnvironment => item.kind === 'env');
              const unknowns = imported.filter((item): item is ImportedUnknown => item.kind === 'unknown');
              let syncedEnvironments = envs;
              if (envs.length > 0) {
                try {
                  const result = await environmentService.batchUpsertEnvironments(projectId, envs.map((environment) => ({
                    name: environment.name,
                    baseUrl: environment.variables.baseUrl || environment.variables.BASE_URL || '',
                    variables: environment.variables,
                  })));
                  syncedEnvironments = result.environments.map(environmentDtoToArtifact);
                } catch {
                  setActiveRequestLog('Environment saved locally; shared environment sync failed');
                }
              }
              setImportedArtifacts((current) => [...current, ...collections, ...syncedEnvironments, ...unknowns]);
              if (syncedEnvironments.length > 0 && !activeEnvironmentId) setActiveEnvironmentId(syncedEnvironments[0].id);
              const firstCollection = collections[0];
              const firstEndpoint = firstCollection?.endpoints[0];
              if (firstEndpoint) {
                setExpandedCollections((current) => ({ ...current, [firstCollection.id]: true }));
                setSelection({ kind: 'api-endpoint', id: firstEndpoint.id, collectionId: firstCollection.id, endpointId: firstEndpoint.id });
                setDraft(cloneJson(firstEndpoint.requestTemplate));
              } else if (envs[0] && !selection) {
                setSelection(null);
                setDraft(createDraft());
              }
              event.target.value = '';
            }}
          />

          {selectedEnvironment && (
            <div className='mt-4 flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className='border-white/15 bg-white/5 text-slate-100'>Environment active</Badge>
              <Badge variant='outline' className='border-white/15 bg-white/5 text-slate-100'>{selectedEnvironment.name}</Badge>
              <span className='text-xs text-slate-400'>{Object.keys(selectedEnvironment.variables).length} variables</span>
            </div>
          )}
        </div>

        <div className='grid items-start gap-4 lg:grid-cols-[minmax(340px,0.3fr)_minmax(0,0.7fr)]'>
          <Card className='flex min-h-0 flex-col overflow-hidden border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl' style={{ height: explorerHeight ? `${explorerHeight}px` : 'calc(100vh - 180px)' }}>
            <CardHeader className='pb-4'>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base text-white'>API Explorer</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scrollbar-none'>
              <section className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <FolderOpen className='h-4 w-4 text-cyan-300' />
                    <span className='font-medium text-white'>Imported APIs</span>
                  </div>
                  <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{explorerTabCounts.imported}</Badge>
                </div>
                <div className='space-y-2'>
                  {visibleApiCollections.length > 0 ? visibleApiCollections.map((collection) => {
                    const expanded = expandedCollections[collection.id] !== false;
                    return (
                      <div key={collection.id} className='rounded-2xl border border-white/10 bg-white/5'>
                        <button
                          type='button'
                          className='flex w-full items-center justify-between gap-3 px-3 py-2 text-left'
                          onClick={() => toggleCollection(collection.id)}
                        >
                          <div className='min-w-0'>
                            <div className='truncate text-sm font-semibold text-white'>{collection.name}</div>
                            <div className='text-[11px] text-slate-400'>{collection.endpoints.length} endpoints</div>
                          </div>
                          {expanded ? <ChevronDown className='h-4 w-4 text-slate-400' /> : <ChevronRight className='h-4 w-4 text-slate-400' />}
                        </button>
                        {expanded && (
                          <div className='border-t border-white/10 p-2'>
                            {groupEndpointsByFolder(collection.endpoints, collection.name).map(([folder, endpoints]) => (
                              <div key={folder} className='mb-3 last:mb-0'>
                                <button
                                  type='button'
                                  className='mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:bg-white/5 hover:text-slate-200'
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
                                    <button
                                      key={endpoint.id}
                                      type='button'
                                      onClick={() => selectApiEndpoint(collection, endpoint)}
                                      className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors last:mb-0 ${
                                        active ? 'bg-cyan-400/15 text-cyan-100' : 'hover:bg-white/5 text-slate-200'
                                      }`}
                                    >
                                      <Badge variant='outline' className='border-white/10 bg-white/5 text-[10px] text-slate-100'>{endpoint.method}</Badge>
                                      <div className='min-w-0'>
                                        <div className='truncate text-xs font-medium'>{endpoint.name}</div>
                                      </div>
                                    </button>
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
              <section className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <ClipboardList className='h-4 w-4 text-emerald-300' />
                    <span className='font-medium text-white'>Manual Requests</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{explorerTabCounts.manual}</Badge>
                    <button type='button' className='rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white' onClick={createNewRequest}><Plus className='h-4 w-4' /></button>
                    <button type='button' className='rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white' onClick={clearManualRequests}><Trash2 className='h-4 w-4' /></button>
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
                          active ? 'bg-cyan-400/15 text-cyan-100' : 'hover:bg-white/5 text-slate-200'
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium'>{item.draft.name}</div>
                          <div className='truncate text-[11px] text-slate-400'>{item.draft.method} · {item.draft.url}</div>
                        </div>
                        <button type='button' className='rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white' onClick={(e) => { e.stopPropagation(); removeItem('manual', item.id); }}>
                          <X className='h-4 w-4' />
                        </button>
                      </button>
                    );
                  }) : (
                    <p className='px-1 py-2 text-xs text-slate-400'>No manual requests yet. Create one with New Request.</p>
                  )}
                </div>
              </section>

              <section className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Save className='h-4 w-4 text-blue-300' />
                    <span className='font-medium text-white'>Saved Requests</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{explorerTabCounts.saved}</Badge>
                    <button type='button' className='rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white' onClick={clearSavedRequests}><Trash2 className='h-4 w-4' /></button>
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
                          active ? 'bg-blue-400/15 text-blue-100' : 'hover:bg-white/5 text-slate-200'
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium'>{item.draft.name}</div>
                          <div className='truncate text-[11px] text-slate-400'>{item.draft.method} · {item.draft.url}</div>
                        </div>
                        <button type='button' className='rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white' onClick={(e) => { e.stopPropagation(); removeItem('saved', item.id); }}>
                          <X className='h-4 w-4' />
                        </button>
                      </button>
                    );
                  }) : (
                    <p className='px-1 py-2 text-xs text-slate-400'>Saved requests will appear here.</p>
                  )}
                </div>
              </section>

              <section className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Globe className='h-4 w-4 text-violet-300' />
                    <span className='font-medium text-white'>Environments</span>
                  </div>
                  <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{explorerTabCounts.env}</Badge>
                </div>
                <div className='space-y-2'>
                  {visibleEnvironments.length > 0 ? visibleEnvironments.map((env) => {
                    const active = activeEnvironmentId === env.id;
                    return (
                      <button
                        key={env.id}
                        type='button'
                        onClick={() => setActiveEnvironmentId(env.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                          active ? 'bg-violet-400/15 text-violet-100' : 'hover:bg-white/5 text-slate-200'
                        }`}
                      >
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium'>{env.name}</div>
                          <div className='truncate text-[11px] text-slate-400'>{Object.keys(env.variables).length} variables</div>
                        </div>
                        <Badge variant='outline' className='border-white/10 bg-white/5 text-[10px] text-slate-100'>ENV</Badge>
                      </button>
                    );
                  }) : (
                    <p className='px-1 py-2 text-xs text-slate-400'>Import `.env` files to see them here.</p>
                  )}
                </div>
              </section>

              <section className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Database className='h-4 w-4 text-amber-300' />
                    <span className='font-medium text-white'>Unknown / raw</span>
                  </div>
                  <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{unknownImports.length}</Badge>
                </div>
                <div className='space-y-2 text-xs text-slate-400'>
                  {unknownImports.length > 0 ? unknownImports.map((item) => (
                    <div key={item.id} className='rounded-xl border border-white/10 bg-white/5 p-2'>
                      <div className='font-medium text-slate-200'>{item.name}</div>
                      <div>{item.summary}</div>
                    </div>
                  )) : <p>Raw files will appear here if they are not recognized as API or environment files.</p>}
                </div>
              </section>
              </>}
            </CardContent>
          </Card>

          <div className='space-y-4'>
            <Card ref={requestWorkspaceRef} className='border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl'>
              <CardHeader className='pb-3'>
                <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
                  <div className='min-w-0 flex-1'>
                    <div className={`flex w-full min-w-0 items-center rounded-xl border bg-slate-950/50 ${
                      missingUrlVariables.length > 0
                        ? 'border-white/10'
                        : hasResolvedUrlVariables
                          ? 'border-emerald-400/60 bg-emerald-400/5 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]'
                          : 'border-white/20'
                    }`}>
                      <div className='relative shrink-0 border-r border-white/15'>
                        <button
                          type='button'
                          onClick={() => setMethodMenuOpen((current) => !current)}
                          className='flex h-12 w-28 items-center justify-between gap-2 px-4 text-left text-sm font-semibold text-amber-300 outline-none hover:bg-white/5'
                          aria-expanded={methodMenuOpen}
                          aria-haspopup='listbox'
                          aria-label='Request method'
                        >
                          {draft.method}
                          <ChevronDown className={`h-4 w-4 transition-transform ${methodMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {methodMenuOpen && (
                          <div className='absolute left-0 top-full z-30 mt-1 w-28 overflow-hidden rounded-lg border border-white/15 bg-slate-900 shadow-xl' role='listbox'>
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
                                className={`block w-full px-4 py-2 text-left text-sm font-medium hover:bg-white/10 ${draft.method === method ? 'bg-white/10 text-amber-300' : 'text-white'}`}
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
                        className={`h-12 min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-slate-500 ${missingUrlVariables.length > 0 ? 'text-slate-400' : 'text-white'}`}
                        placeholder='Enter request URL'
                        aria-label='Request URL'
                        title={urlVariablePreview || 'No environment variables in this URL'}
                      />
                      {urlTemplateVariables.length > 0 && (
                        <span className={`mr-3 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          missingUrlVariables.length > 0 ? 'bg-white/10 text-slate-500' : 'bg-emerald-400/15 text-emerald-300'
                        }`} title={missingUrlVariables.length > 0 ? `Missing environment variables: ${missingUrlVariables.join(', ')}` : 'Environment variables resolved'}>
                          {missingUrlVariables.length > 0 ? 'Inactive' : 'Active'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    {saveConfirmation && (
                      <span role='status' className='rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-200'>
                        {saveConfirmation}
                      </span>
                    )}
                    <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' onClick={saveCurrentRequest}>
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
                <div className='flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-2'>
                  {(['params', 'headers', 'authorization', 'body', 'scripts', 'tests', 'settings'] as const).map((tab) => (
                    <button
                      key={tab}
                      type='button'
                      onClick={() => setRequestTab(tab)}
                      className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                        requestTab === tab ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {requestTab === 'params' && (
                  <div className='space-y-4'>
                    <section className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                      <div className='mb-3 flex items-center justify-between'>
                        <h3 className='font-medium text-white'>Path Parameters</h3>
                        <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{draft.pathParams.length}</Badge>
                      </div>
                      <div className='space-y-2'>
                        {draft.pathParams.length > 0 ? draft.pathParams.map((row, index) => (
                          <div key={row.id} className='grid gap-2 md:grid-cols-[1fr_1fr_140px_1fr_auto]'>
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, pathParams: current.pathParams.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, pathParams: current.pathParams.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Value' />
                            <select className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none'>
                              <option>string</option>
                              <option>number</option>
                              <option>boolean</option>
                            </select>
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, pathParams: current.pathParams.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200' onClick={() => setDraft((current) => ({ ...current, pathParams: current.pathParams.filter((item) => item.id !== row.id) }))}>
                              Remove
                            </button>
                          </div>
                        )) : (
                          <p className='text-sm text-slate-400'>No path parameters detected.</p>
                        )}
                      </div>
                    </section>

                    <section className='rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                      <div className='mb-3 flex items-center justify-between'>
                        <h3 className='font-medium text-white'>Query Parameters</h3>
                        <div className='flex gap-2'>
                          <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' size='sm' onClick={() => setDraft((current) => ({ ...current, queryParams: [...current.queryParams, createIdRow()] }))}>
                            <Plus className='mr-2 h-4 w-4' />
                            Add
                          </Button>
                        </div>
                      </div>
                      <div className='space-y-2'>
                        {draft.queryParams.map((row) => (
                          <div key={row.id} className='grid gap-2 md:grid-cols-[72px_1fr_1fr_1fr_auto]'>
                            <input type='checkbox' checked={row.enabled} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, enabled: e.target.checked } : item) }))} className='h-4 w-4 rounded border-white/20 accent-cyan-400' />
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Value' />
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, queryParams: current.queryParams.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200' onClick={() => setDraft((current) => ({ ...current, queryParams: current.queryParams.filter((item) => item.id !== row.id) }))}>
                              Remove
                            </button>
                          </div>
                        ))}
                        {draft.queryParams.length === 0 && <p className='text-sm text-slate-400'>Add query parameters to build the request URL.</p>}
                      </div>
                    </section>
                  </div>
                )}

                {requestTab === 'headers' && (
                  <section className='space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium text-white'>Headers</h3>
                      <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' size='sm' onClick={() => setDraft((current) => ({ ...current, headers: [...current.headers, createHeaderRow()] }))}>
                        <Plus className='mr-2 h-4 w-4' />
                        Add header
                      </Button>
                    </div>
                    <div className='space-y-2'>
                      {draft.headers.map((row) => (
                        <div key={row.id} className='grid gap-2 md:grid-cols-[1fr_1fr_auto]'>
                          <input value={row.name} onChange={(e) => setDraft((current) => ({ ...current, headers: current.headers.map((item) => item.id === row.id ? { ...item, name: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Header name' />
                          <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, headers: current.headers.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Header value' />
                          <button type='button' className='rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200' onClick={() => setDraft((current) => ({ ...current, headers: current.headers.filter((item) => item.id !== row.id) }))}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {requestTab === 'authorization' && (
                  <section className='space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                    <div className='flex items-center justify-between'>
                      <h3 className='font-medium text-white'>Authorization</h3>
                      <Shield className='h-4 w-4 text-slate-400' />
                    </div>
                    <label className='block'>
                      <span className='mb-1.5 block text-sm font-medium text-slate-200'>Auth type</span>
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
                      })} className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none'>
                        {AUTH_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </label>
                    <div className='flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2'>
                      <span className='text-sm text-slate-300'>OAuth token</span>
                      <Badge variant={oauthTokenState === 'Active' ? 'success' : oauthTokenState === 'Expired' ? 'destructive' : 'outline'} className={oauthTokenState === 'Missing token' ? 'border-white/15 bg-white/5 text-slate-400' : ''}>
                        {oauthTokenState}
                      </Badge>
                    </div>
                    {draft.auth.type === 'bearer' && (
                      <div className='space-y-2'>
                        <input value={draft.auth.bearerToken} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, bearerToken: e.target.value } }))} className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='{{accessToken}} or enter a token' />
                        {environmentToken && <p className='text-xs text-emerald-200'>Using the active environment token automatically.</p>}
                      </div>
                    )}
                    {draft.auth.type === 'basic' && (
                      <div className='grid gap-2 md:grid-cols-2'>
                        <input value={draft.auth.username} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, username: e.target.value } }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Username' />
                        <input value={draft.auth.password} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, password: e.target.value } }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Password' type='password' />
                      </div>
                    )}
                    {draft.auth.type === 'apiKey' && (
                      <div className='grid gap-2 md:grid-cols-3'>
                        <input value={draft.auth.keyName} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, keyName: e.target.value } }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Header/query name' />
                        <select value={draft.auth.keyLocation} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, keyLocation: e.target.value as 'header' | 'query' | 'cookie' } }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none'>
                          <option value='header'>Header</option>
                          <option value='query'>Query</option>
                          <option value='cookie'>Cookie</option>
                        </select>
                        <input value={draft.auth.keyValue} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, keyValue: e.target.value } }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Value' />
                      </div>
                    )}
                    {draft.auth.type === 'oauth2' && (
                      <div className='space-y-2'>
                        <input value={draft.auth.oauth2Token} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, oauth2Token: e.target.value } }))} className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='{{accessToken}} or enter a token' />
                        <input value={draft.auth.oauth2Scopes} onChange={(e) => setDraft((current) => ({ ...current, auth: { ...current.auth, oauth2Scopes: e.target.value } }))} className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Scopes, space separated' />
                        {environmentToken && !draft.auth.oauth2Token && <p className='text-xs text-emerald-200'>Using the active environment token automatically.</p>}
                      </div>
                    )}
                  </section>
                )}

                {requestTab === 'body' && (
                  <section className='space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                    <div className='flex flex-wrap gap-2'>
                      {BODY_MODES.map((option) => (
                        <button
                          key={option.value}
                          type='button'
                          onClick={() => setDraft((current) => ({ ...current, bodyMode: option.value }))}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            draft.bodyMode === option.value ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {draft.bodyMode === 'none' && <p className='rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400'>No body will be sent.</p>}
                    {draft.bodyMode === 'raw' && (
                      <div className='space-y-3'>
                        <select value={draft.rawBodyType} onChange={(e) => setDraft((current) => ({ ...current, rawBodyType: e.target.value as RawBodyType }))} className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none'>
                          {RAW_BODY_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <textarea value={draft.rawBody} onChange={(e) => setDraft((current) => ({ ...current, rawBody: e.target.value }))} rows={12} className='w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 font-mono text-sm text-white outline-none' />
                      </div>
                    )}
                    {draft.bodyMode === 'form-data' && (
                      <div className='space-y-2'>
                        {draft.formDataRows.map((row) => (
                          <div key={row.id} className='grid gap-2 md:grid-cols-[72px_1fr_1fr_1fr_auto]'>
                            <input type='checkbox' checked={row.enabled} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, enabled: e.target.checked } : item) }))} className='h-4 w-4 rounded border-white/20 accent-cyan-400' />
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Value' />
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200' onClick={() => setDraft((current) => ({ ...current, formDataRows: current.formDataRows.filter((item) => item.id !== row.id) }))}>Remove</button>
                          </div>
                        ))}
                        <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' onClick={() => setDraft((current) => ({ ...current, formDataRows: [...current.formDataRows, createIdRow()] }))}>
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
                            <input value={row.key} onChange={(e) => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.map((item) => item.id === row.id ? { ...item, key: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Key' />
                            <input value={row.value} onChange={(e) => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.map((item) => item.id === row.id ? { ...item, value: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Value' />
                            <input value={row.description} onChange={(e) => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.map((item) => item.id === row.id ? { ...item, description: e.target.value } : item) }))} className='h-10 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Description' />
                            <button type='button' className='rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200' onClick={() => setDraft((current) => ({ ...current, urlEncodedRows: current.urlEncodedRows.filter((item) => item.id !== row.id) }))}>Remove</button>
                          </div>
                        ))}
                        <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' onClick={() => setDraft((current) => ({ ...current, urlEncodedRows: [...current.urlEncodedRows, createIdRow()] }))}>
                          <Plus className='mr-2 h-4 w-4' />
                          Add row
                        </Button>
                      </div>
                    )}
                    {draft.bodyMode === 'binary' && (
                      <div className='space-y-3'>
                        <input ref={binaryFileInputRef} type='file' className='block w-full rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white' onChange={(event) => setDraft((current) => ({ ...current, binaryFile: event.target.files?.[0] ?? null }))} />
                        <div className='rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400'>
                          {draft.binaryFile ? `Selected file: ${draft.binaryFile.name}` : 'Choose a file to upload as the request body.'}
                        </div>
                      </div>
                    )}
                    {draft.bodyMode === 'graphql' && (
                      <div className='space-y-3'>
                        <textarea value={draft.graphqlQuery} onChange={(e) => setDraft((current) => ({ ...current, graphqlQuery: e.target.value }))} rows={8} className='w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 font-mono text-sm text-white outline-none' placeholder='query Example { __typename }' />
                        <textarea value={draft.graphqlVariables} onChange={(e) => setDraft((current) => ({ ...current, graphqlVariables: e.target.value }))} rows={8} className='w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 font-mono text-sm text-white outline-none' placeholder='{"id":123}' />
                      </div>
                    )}
                  </section>
                )}

                {requestTab === 'scripts' && (
                  <section className='space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                    <label className='block'>
                      <span className='mb-1.5 block text-sm font-medium text-white'>Pre-request script</span>
                      <textarea value={draft.preRequestScript} onChange={(e) => setDraft((current) => ({ ...current, preRequestScript: e.target.value }))} rows={10} className='w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 font-mono text-sm text-white outline-none' placeholder='helpers.setHeader("X-Test", "1")' />
                    </label>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300'>
                      <div className='mb-2 font-medium text-white'>Script output</div>
                      {lastScriptOutput.length > 0 ? lastScriptOutput.map((line, index) => <div key={index}>{line}</div>) : <p>No output yet.</p>}
                    </div>
                  </section>
                )}

                {requestTab === 'tests' && (
                  <section className='space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                    <label className='block'>
                      <span className='mb-1.5 block text-sm font-medium text-white'>Tests</span>
                      <textarea value={draft.testScript} onChange={(e) => setDraft((current) => ({ ...current, testScript: e.target.value }))} rows={10} className='w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 font-mono text-sm text-white outline-none' placeholder='test("status is 200", () => assert(response.status === 200, "status is 200"))' />
                    </label>
                    <div className='space-y-2'>
                      {response.tests.length > 0 ? response.tests.map((test, index) => (
                        <div key={index} className={`rounded-xl border px-3 py-2 text-sm ${test.passed ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-rose-400/20 bg-rose-400/10 text-rose-100'}`}>
                          {test.name} · {test.message || (test.passed ? 'Passed' : 'Failed')}
                        </div>
                      )) : <p className='text-sm text-slate-400'>Run the request to see test results here.</p>}
                    </div>
                  </section>
                )}

                {requestTab === 'settings' && (
                  <section className='space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-3'>
                    <div className='rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-3'>
                      <div className='mb-1 flex items-center justify-between gap-3'>
                        <div>
                          <div className='text-sm font-medium text-white'>Runtime test data</div>
                          <p className='mt-1 text-xs text-slate-400'>Generate fresh values for this endpoint on every request.</p>
                        </div>
                        <Badge variant='outline' className='border-cyan-400/30 bg-cyan-400/10 text-cyan-100'>Per endpoint</Badge>
                      </div>
                      {runtimeMappings.length > 0 ? (
                        <div className='mt-3 space-y-2'>
                          {runtimeMappings.map((mapping) => (
                            <div key={mapping.field} className='grid gap-2 md:grid-cols-[1fr_180px_1fr]'>
                              <div className='flex items-center rounded-xl border border-white/10 bg-slate-950/50 px-3 text-sm text-white'>
                                {mapping.field}
                              </div>
                              <select
                                value={mapping.strategy}
                                onChange={(event) => updateRuntimeMapping(mapping.field, { strategy: event.target.value as RuntimeDataStrategy })}
                                className='h-10 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none'
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
                                    className='h-10 min-w-0 rounded-xl border border-white/10 bg-slate-950/70 px-2 text-xs text-white outline-none'
                                  >
                                    <option value=''>Choose dataset</option>
                                    {testDataDatasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
                                  </select>
                                  <input
                                    value={mapping.column || ''}
                                    onChange={(event) => updateRuntimeMapping(mapping.field, { column: event.target.value })}
                                    placeholder='Column, e.g. email'
                                    className='h-10 min-w-0 rounded-xl border border-white/10 bg-slate-950/70 px-2 text-xs text-white outline-none placeholder:text-slate-500'
                                  />
                                </div>
                              ) : (mapping.strategy === 'environment' || mapping.strategy === 'response') ? (
                                <input
                                  value={mapping.source || ''}
                                  onChange={(event) => updateRuntimeMapping(mapping.field, { source: event.target.value })}
                                  placeholder={mapping.strategy === 'response' ? 'Response field, e.g. id' : 'Environment key'}
                                  className='h-10 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none placeholder:text-slate-500'
                                />
                              ) : (
                                <div className='flex items-center px-2 text-xs text-slate-400'>
                                  {mapping.strategy === 'none' ? 'Keeps the configured value' : 'Created at send time'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className='mt-3 rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-400'>No dynamic fields detected in this request. Add a field such as `email` or `username` to configure runtime data.</p>
                      )}
                      <p className='mt-3 text-xs text-slate-500'>Generated values are injected only for execution. Successful response mappings are stored in the active environment for later requests.</p>
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>

            <div className='space-y-4'>
              <Card ref={responsePanelRef} className='border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl'>
                <CardHeader className='pb-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <CardTitle className='text-base text-white'>Response</CardTitle>
                    </div>
                    <div className='flex items-center gap-2'>
                      {RESPONSE_TABS.map((tab) => (
                        <button key={tab.value} type='button' onClick={() => setResponseTab(tab.value)} className={`rounded-xl px-3 py-2 text-xs transition-colors ${responseTab === tab.value ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                          {tab.label}
                        </button>
                      ))}
                      <Button type='button' variant='outline' size='sm' className='border-white/15 bg-white/5 text-white' onClick={() => void copyResponse()} disabled={!response.body} title='Copy response'>
                        <Copy className='h-4 w-4' />
                      </Button>
                      <Button type='button' variant='outline' size='sm' className='border-red-400/30 bg-red-400/10 text-red-100 hover:bg-red-400/20' onClick={clearCurrentResponse} disabled={!response.body} title='Clear response'>
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
                          <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{response.durationMs ?? 0} ms</Badge>
                          <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{response.sizeBytes !== null ? toReadableSize(response.sizeBytes) : '0 B'}</Badge>
                        </div>
                        <div className='flex items-center gap-2'>
                          {RESPONSE_VIEW_MODES.map((mode) => (
                            <button key={mode.value} type='button' onClick={() => setResponseBodyView(mode.value)} className={`rounded-xl px-3 py-2 text-xs transition-colors ${responseBodyView === mode.value ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                        {responseBodyView === 'preview' ? (
                          <JsonViewer data={response.isJson ? parseJsonSafely(response.body) ?? response.body : response.body} className='border-0 bg-transparent' />
                        ) : responseBodyDisplay ? (
                          <pre className='max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-xs text-slate-100'>
                            {responseBodyView === 'pretty' && response.isJson ? response.body : responseBodyDisplay}
                          </pre>
                        ) : (
                          <div className='rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400'>Send a request to see the response here.</div>
                        )}
                      </div>
                    </>
                  )}

                  {responseTab === 'headers' && (
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-sm text-slate-200'>
                      {response.headers.length > 0 ? response.headers.map(([name, value]) => (
                        <div key={`${name}:${value}`} className='break-words border-b border-white/5 py-1 last:border-0'><span className='font-medium text-white'>{name}</span>: {value}</div>
                      )) : <p className='text-slate-400'>No response headers available yet.</p>}
                    </div>
                  )}

                  {responseTab === 'cookies' && (
                    <div className='space-y-2'>
                      {response.cookies.length > 0 ? response.cookies.map((cookie, index) => (
                        <div key={index} className='rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-200'>{cookie}</div>
                      )) : <div className='rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400'>No cookies detected in the current response.</div>}
                    </div>
                  )}

                  {responseTab === 'timeline' && (
                    <div className='grid gap-3 md:grid-cols-2'>
                      <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                        <div className='text-xs uppercase tracking-[0.2em] text-slate-400'>Request</div>
                        <div className='mt-2 text-sm text-white'>{response.requestMethod || draft.method}</div>
                        <div className='mt-1 break-all text-xs text-slate-300'>{response.requestUrl || draft.url}</div>
                      </div>
                      <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                        <div className='text-xs uppercase tracking-[0.2em] text-slate-400'>Timing</div>
                        <div className='mt-2 text-sm text-white'>{response.durationMs ?? 0} ms</div>
                        <div className='mt-1 text-xs text-slate-300'>{response.startedAt ? new Date(response.startedAt).toLocaleString() : 'Not sent yet'}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {false && <Card className='border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-base text-white'>Quick Action</CardTitle>
                  <CardDescription className='text-slate-300'>Everything here is actionable and stateful.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-sm text-slate-300'>
                  <button type='button' className='flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10' onClick={saveCurrentRequest}>
                    <div>
                      <div className='font-medium text-white'>Save current request</div>
                      <div className='text-xs text-slate-400'>Create or update a saved request.</div>
                    </div>
                    <ArrowRight className='h-4 w-4 text-slate-400' />
                  </button>
                  <button type='button' className='flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10' onClick={createNewRequest}>
                    <div>
                      <div className='font-medium text-white'>Create manual request</div>
                      <div className='text-xs text-slate-400'>Start a new editable request.</div>
                    </div>
                    <Plus className='h-4 w-4 text-slate-400' />
                  </button>
                  <button type='button' className='flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10' onClick={() => fileInputRef.current?.click()}>
                    <div>
                      <div className='font-medium text-white'>Import API definition</div>
                      <div className='text-xs text-slate-400'>OpenAPI, Swagger, Postman, Environment.</div>
                    </div>
                    <UploadCloud className='h-4 w-4 text-slate-400' />
                  </button>
                  <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                    <div className='text-xs uppercase tracking-[0.2em] text-slate-400'>Current request</div>
                    <div className='mt-2 text-sm font-medium text-white'>{currentRequestInfo[1]}</div>
                    <div className='mt-1 text-xs text-slate-300'>{currentRequestInfo[0]}</div>
                    <div className='mt-1 break-all text-[11px] text-slate-400'>{currentRequestInfo[2]}</div>
                  </div>
                </CardContent>
              </Card>}
            </div>

            <Card className='border-white/10 bg-white/5 text-white shadow-2xl backdrop-blur-xl'>
              <CardHeader className='pb-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div>
                    <CardTitle className='text-base text-white'>Context & Utilities</CardTitle>
                    <CardDescription className='text-slate-300'>Quick access to related request assets.</CardDescription>
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
                          className={`rounded-xl px-3 py-2 text-xs transition-colors ${active ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
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
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Selected endpoint</div>
                      <div className='mt-1 text-xs text-slate-300'>{selectedApiEndpoint?.name || draft.name}</div>
                      <div className='mt-2 text-xs text-slate-400'>{selectedCollectionMeta?.name || 'Manual request'}</div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Environment</div>
                      <div className='mt-1 text-xs text-slate-300'>{activeEnvironment?.name || 'None selected'}</div>
                      <div className='mt-2 text-xs text-slate-400'>{activeEnvironment ? `${Object.keys(activeEnvironment.variables).length} variables` : 'Import an environment file to enable variable resolution.'}</div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Utility actions</div>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' size='sm' onClick={clearImports}><RotateCcw className='mr-2 h-4 w-4' />Clear imports</Button>
                        <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' size='sm' onClick={saveCurrentRequest}><Save className='mr-2 h-4 w-4' />Save</Button>
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === 'tests' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Last test results</div>
                      <div className='mt-3 space-y-2'>
                        {response.tests.length > 0 ? response.tests.map((test, index) => (
                          <div key={index} className={`rounded-xl border px-3 py-2 text-sm ${test.passed ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-rose-400/20 bg-rose-400/10 text-rose-100'}`}>
                            {test.name} · {test.message || (test.passed ? 'Passed' : 'Failed')}
                          </div>
                        )) : <p className='text-sm text-slate-400'>No tests run yet.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Test script</div>
                      <pre className='mt-3 max-h-64 overflow-auto rounded-xl bg-black/20 p-3 text-xs text-slate-100 whitespace-pre-wrap'>{draft.testScript || 'Add a test script in the Tests tab to validate responses.'}</pre>
                    </div>
                  </div>
                )}

                {bottomTab === 'environments' && (
                  <div className='grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]'>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Select environment</div>
                      <div className='mt-3 space-y-2'>
                        {environments.length > 0 ? environments.map((env) => (
                          <button
                            key={env.id}
                            type='button'
                            onClick={() => setActiveEnvironmentId(env.id)}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${activeEnvironmentId === env.id ? 'bg-violet-400/15 text-violet-100' : 'hover:bg-white/5 text-slate-200'}`}
                          >
                            <span className='truncate'>{env.name}</span>
                            <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{Object.keys(env.variables).length}</Badge>
                          </button>
                        )) : <p className='text-sm text-slate-400'>Import env files to see them here.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Variables</div>
                      <div className='mt-3'>
                        {activeEnvironment ? (
                          <JsonViewer data={activeEnvironment.variables} className='border-0 bg-transparent' />
                        ) : (
                          <p className='text-sm text-slate-400'>No active environment selected.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === 'mock' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Mock servers</div>
                      <div className='mt-3 space-y-2 text-sm text-slate-300'>
                        {apiCollections.length > 0 ? apiCollections.slice(0, 5).map((collection) => (
                          <div key={collection.id} className='rounded-xl border border-white/10 bg-white/5 p-3'>
                            <div className='font-medium text-white'>{collection.name}</div>
                            <div className='mt-1 text-xs text-slate-400'>{collection.endpoints.length} endpoints</div>
                          </div>
                        )) : <p>No imported API definitions yet.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>OpenAPI / Postman source</div>
                      <pre className='mt-3 max-h-64 overflow-auto rounded-xl bg-black/20 p-3 text-xs text-slate-100 whitespace-pre-wrap'>
                        {selectedApiEndpoint ? stringifyJson(selectedApiEndpoint.raw) : 'Select an imported API endpoint to inspect its raw source.'}
                      </pre>
                    </div>
                  </div>
                )}

                {bottomTab === 'documentation' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Imported documents</div>
                      <div className='mt-3 space-y-2'>
                        {importedArtifacts.map((artifact) => (
                          <div key={artifact.id} className='rounded-xl border border-white/10 bg-white/5 p-3'>
                            <div className='flex items-center gap-2'>
                              <Badge variant='outline' className='border-white/10 bg-white/5 text-slate-100'>{artifact.kind.toUpperCase()}</Badge>
                              <div className='font-medium text-white'>{artifact.name}</div>
                            </div>
                            <div className='mt-1 text-xs text-slate-400'>{artifact.summary}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Reference viewer</div>
                      <div className='mt-3'>
                        {selectedApiEndpoint?.raw ? <JsonViewer data={selectedApiEndpoint.raw} className='border-0 bg-transparent' /> : <p className='text-sm text-slate-400'>Select an endpoint to inspect its documentation metadata.</p>}
                      </div>
                    </div>
                  </div>
                )}

                {bottomTab === 'activity' && (
                  <div className='grid gap-4 lg:grid-cols-2'>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Recent activity</div>
                      <div className='mt-3 space-y-2'>
                        {history.length > 0 ? history.map((item) => (
                          <button key={item.id} type='button' onClick={() => {
                            setActiveRequestLog(`Reopened ${item.requestName}`);
                            setDraft((current) => ({ ...current, name: item.requestName, method: item.method, url: item.url }));
                          }} className='flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10'>
                            <div>
                              <div className='font-medium text-white'>{item.requestName}</div>
                              <div className='text-xs text-slate-400'>{item.method} · {item.status ?? 'n/a'}</div>
                            </div>
                            <Clock3 className='h-4 w-4 text-slate-400' />
                          </button>
                        )) : <p className='text-sm text-slate-400'>No activity yet.</p>}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-3'>
                      <div className='text-sm font-medium text-white'>Current status</div>
                      <div className='mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300'>{activeRequestLog}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {environmentManagerOpen && (
        <div className='fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm' role='dialog' aria-modal='true' aria-label='Manage environments'>
          <div className='flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-slate-900 p-5 text-white shadow-2xl'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h2 className='text-lg font-semibold'>Manage environments</h2>
                <p className='mt-1 text-sm text-slate-400'>Create, import, edit, activate, or delete environments without leaving the API workspace.</p>
              </div>
              <button type='button' className='rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white' onClick={() => setEnvironmentManagerOpen(false)} aria-label='Close environment manager'>
                <X className='h-5 w-5' />
              </button>
            </div>
            <div className='mt-5 flex flex-wrap gap-2'>
              <input value={environmentSearch} onChange={(event) => setEnvironmentSearch(event.target.value)} className='h-10 min-w-[220px] flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none' placeholder='Search environments' />
              <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' onClick={() => { setEnvironmentEditorTarget(undefined); setEnvironmentEditorOpen(true); }}>
                <Plus className='mr-2 h-4 w-4' /> New
              </Button>
              <Button type='button' variant='outline' className='border-white/15 bg-white/5 text-white' onClick={() => setEnvironmentImportOpen(true)}>
                <UploadCloud className='mr-2 h-4 w-4' /> Import
              </Button>
            </div>
            <div className='mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
              {managedEnvironmentList.length > 0 ? managedEnvironmentList.map((environment) => (
                <div key={environment.id} className={`rounded-2xl border p-4 ${activeEnvironmentId === environment.id ? 'border-violet-400/50 bg-violet-400/10' : 'border-white/10 bg-white/5'}`}>
                  <div className='flex items-start justify-between gap-3'>
                    <button type='button' className='min-w-0 flex-1 text-left' onClick={() => setActiveEnvironmentId(environment.id)}>
                      <div className='flex items-center gap-2'>
                        <span className='truncate font-medium'>{environment.name}</span>
                        {activeEnvironmentId === environment.id && <Badge variant='outline' className='border-emerald-400/30 bg-emerald-400/10 text-emerald-200'>Active</Badge>}
                      </div>
                      <p className='mt-1 truncate text-xs text-slate-400'>{environment.baseUrl || 'No base URL set'}</p>
                      <p className='mt-2 text-xs text-slate-500'>{Object.keys(environment.variables || {}).length} variables</p>
                    </button>
                    <div className='flex shrink-0 gap-2'>
                      <Button type='button' variant='outline' size='sm' className='border-white/15 bg-white/5 text-white' onClick={() => { setEnvironmentEditorTarget(environment); setEnvironmentEditorOpen(true); }}>Edit</Button>
                      <Button type='button' variant='outline' size='sm' className='border-red-400/30 bg-red-400/10 text-red-100' onClick={() => void deleteManagedEnvironment(environment)} disabled={environmentActionBusy}><Trash2 className='h-4 w-4' /></Button>
                    </div>
                  </div>
                </div>
              )) : <div className='rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400'>No managed environments found.</div>}
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
      <ImportEnvironmentModal open={environmentImportOpen} onClose={() => setEnvironmentImportOpen(false)} onImport={(data) => void handleEnvironmentImport(data)} isImporting={environmentActionBusy} />
    </div>
  );
};

export default ApiExecutionPage;
