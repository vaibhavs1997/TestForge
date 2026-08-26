// ImportApiContract - Application Use Case for importing API specifications.
//
// Supported formats:
//   • OpenAPI 3.x  (JSON or YAML)
//   • Swagger 2.0  (JSON or YAML)
//   • Postman Collection v2.1 (JSON)
//   • GraphQL Schema (.graphql)
//   • GraphQL Introspection JSON
import { randomUUID } from 'node:crypto';
import * as yaml from 'js-yaml';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity.js';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import { EventPublisher } from '../EventPublisher.js';
import { extractOpenApiSampleRequestBody, extractOpenApiRequiredRequestBodyFields, extractPostmanSampleRequestBody } from './openApiSampleBody.js';
import { buildOpenApiServiceImportKey, resolveOpenApiOperationContract } from './openApiResolution.js';
import type { FieldDataRuleRepository } from '../../domain/test-data/FieldDataRuleRepository.js';

// ─── DTOs ────────────────────────────────────────────────

export interface ImportSummary {
  servicesImported: number;
  servicesUpdated: number;
  operationsImported: number;
  operationsUpdated: number;
  operationsRemoved: number;
  /** @deprecated Kept for API compatibility; always 0 when upsert/replace is used */
  duplicatesSkipped: number;
  warnings: string[];
  detectedEnvironments: DetectedEnvironment[];
  /** Contract-agnostic reconciliation output. `REMOVED` is never a delete. */
  changes?: ContractChange[];
  impacts?: ContractImpact;
  preview?: boolean;
}

export type ContractDiffStatus = 'ADDED' | 'UNCHANGED' | 'NON_MATERIAL_CHANGE' | 'MATERIAL_CHANGE' | 'BREAKING_CHANGE' | 'REMOVED';
export interface ContractChange { operationId?: string; serviceId?: string; method: string; path: string; status: ContractDiffStatus; reasons: string[]; manual?: boolean; reviewRequired: boolean; }
export interface ContractImpact { requirementMappings: number; testCases: number; testCaseVersions: number; suites: number; schedules: number; runtimeLinks: number; fieldDataRules: number; }

type ImpactKind = keyof ContractImpact;
type ProjectRecordRepository = { findByProject(projectId: string): Promise<any[]>; impactKind?: ImpactKind };

function stable(value: unknown): string { return JSON.stringify(value ?? null); }
function withoutSavedEditor(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const { requestEditor: _requestEditor, ...contractMetadata } = value as Record<string, unknown>;
  return contractMetadata;
}
function operationDiff(existing: any, incoming: ParsedOperation): { status: ContractDiffStatus; reasons: string[] } {
  if (!existing) return { status: 'ADDED', reasons: ['Operation was added by the contract.'] };
  // The saved request-editor template is user configuration, not contract
  // metadata. It must neither create a false contract change nor be replaced
  // during a re-import.
  const before = withoutSavedEditor(existing.sourceOperation) ?? {};
  const after = incoming.sourceOperation ?? {};
  if (stable(before) === stable(after) && existing.name === incoming.name && existing.description === incoming.description) return { status: 'UNCHANGED', reasons: ['No contract metadata changed.'] };
  const requestBefore = (before as any).requestBody ?? (before as any).parameters;
  const requestAfter = (after as any).requestBody ?? (after as any).parameters;
  if (stable(requestBefore) !== stable(requestAfter) || stable(existing.requiredRequestBodyFields) !== stable(incoming.requiredRequestBodyFields)) return { status: 'BREAKING_CHANGE', reasons: ['Request schema or required input changed.'] };
  if (stable((before as any).responses) !== stable((after as any).responses)) return { status: 'MATERIAL_CHANGE', reasons: ['Response schema changed.'] };
  return { status: 'NON_MATERIAL_CHANGE', reasons: ['Only descriptive, authentication, or non-executable metadata changed.'] };
}

export interface DetectedEnvironment {
  name: string;
  baseUrl: string;
  description?: string;
}

interface ParsedOperation {
  name: string;
  method: string;
  path: string;
  requestUrl?: string;
  description: string;
  authenticationType: string;
  status: string;
  sampleRequestBody: Record<string, unknown> | null;
  requiredRequestBodyFields: string[] | null;
  tags?: string[];
  contentTypes?: string[];
  sourceOperation?: Record<string, unknown> | null;
}

interface ParsedService {
  name: string;
  description: string;
  version: string;
  tags: string[];
  baseUrl?: string;
  folderPath?: string;
  importKey?: string;
  sourceContract?: Record<string, unknown> | null;
  operations: ParsedOperation[];
}

// ─── Spec type detection ─────────────────────────────────

type SpecType = 'openapi3' | 'swagger2' | 'postman' | 'graphql-schema' | 'graphql-introspection' | 'unknown';

function stripBom(content: string): string {
  return content.replace(/^\uFEFF/, '');
}

function detectSpecType(content: string, fileName: string): SpecType {
  const normalized = stripBom(content);
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'graphql' || ext === 'gql') return 'graphql-schema';

  if (ext === 'json') {
    try {
      const parsed = JSON.parse(normalized);
      return detectFromObject(parsed);
    } catch {
      return 'unknown';
    }
  }

  if (ext === 'yaml' || ext === 'yml') {
    try {
      const parsed = yaml.load(normalized);
      if (typeof parsed === 'object' && parsed !== null) {
        return detectFromObject(parsed as Record<string, unknown>);
      }
    } catch {
      return 'unknown';
    }
  }

  // Fallback: auto-detect from content
  try {
    const parsed = JSON.parse(normalized);
    return detectFromObject(parsed);
  } catch {
    if (/type\s+(Query|Mutation|Subscription)\s*\{/.test(normalized)) {
      return 'graphql-schema';
    }
  }

  return 'unknown';
}

function detectFromObject(obj: Record<string, unknown>): SpecType {
  if (typeof obj.openapi === 'string') return 'openapi3';
  if (typeof obj.swagger === 'string') return 'swagger2';
  if (obj.info && obj.item && typeof obj.item === 'object') return 'postman';
  if (obj.__schema && typeof obj.__schema === 'object') return 'graphql-introspection';
  return 'unknown';
}

// ─── Spec parsing & extraction helpers ───────────────────

function parseJsonOrYaml(content: string, fileName: string): any {
  const normalized = stripBom(content);
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'json') return JSON.parse(normalized);
  try {
    return JSON.parse(normalized);
  } catch {
    return yaml.load(normalized);
  }
}

function normalizeMethod(raw: string): string {
  return String(raw || '').trim().toUpperCase();
}

function operationName(op: any, path: string, method: string): string {
  if (op?.operationId) return String(op.operationId);
  if (op?.summary) return String(op.summary);
  if (op?.name) return String(op.name);
  return `${method.toUpperCase()} ${path}`;
}

function resolveOpenApiServerUrl(server: any, spec: any): string {
  const rawUrl = String(server?.url || '').trim();
  if (!rawUrl) return '';

  const variables = server?.variables && typeof server.variables === 'object' ? server.variables : {};
  return rawUrl.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const variable = variables[key];
    if (variable && typeof variable === 'object') {
      const candidate = variable.default ?? (Array.isArray(variable.enum) ? variable.enum[0] : undefined);
      if (candidate !== undefined && candidate !== null) return String(candidate);
    }

    const specVariable = spec?.variables?.[key];
    if (specVariable && typeof specVariable === 'object' && specVariable.default !== undefined) {
      return String(specVariable.default);
    }

    return match;
  });
}

function extractAuthType(spec: any, pathItem: any, operation: any): string {
  const schemes: Record<string, any> = spec?.components?.securitySchemes || spec?.securityDefinitions || {};
  const opSecurity: any[] = operation?.security ?? pathItem?.security ?? spec?.security ?? [];

  const allSecurity = [...opSecurity, ...(pathItem?.security ?? []), ...(spec?.security ?? [])];
  const schemeNames = new Set<string>();
  for (const sec of allSecurity) {
    if (typeof sec === 'object' && sec !== null) {
      Object.keys(sec).forEach((k) => schemeNames.add(k));
    }
  }

  for (const name of schemeNames) {
    const scheme = schemes[name];
    if (!scheme) continue;
    if (scheme.type === 'http' && scheme.scheme === 'bearer') return 'Bearer Token';
    if (scheme.type === 'http' && scheme.scheme === 'basic') return 'Basic Authentication';
    if (scheme.type === 'apiKey') return 'API Key';
    if (scheme.type === 'oauth2') return 'OAuth 2.0';
  }
  return 'None';
}

// ─── OpenAPI 3.x & Swagger 2.0 extraction ───────────────

function extractFromOpenApi(spec: any, warnings: string[]): ParsedService[] {
  const info = spec.info || {};
  const specTitle = String(info.title || 'Imported API');
  const specVersion = String(info.version || 'v1');
  const specDescription = String(info.description || '');
  const paths = spec.paths || {};
  const specBaseUrl = openApiPrimaryBaseUrl(spec);
  const servicesByKey: Map<string, ParsedService> = new Map();
  let sawTaggedOperation = false;

  const ensureService = (serviceName: string, folderPath?: string): ParsedService => {
    const importKey = buildOpenApiServiceImportKey({
      specTitle,
      serviceName,
      folderPath,
    });
    if (!servicesByKey.has(importKey)) {
      servicesByKey.set(importKey, {
        name: serviceName,
        description: specDescription,
        version: specVersion,
        tags: [],
        baseUrl: specBaseUrl || undefined,
        folderPath,
        importKey,
        sourceContract: JSON.parse(JSON.stringify(spec)),
        operations: [],
      });
    }
    return servicesByKey.get(importKey) as ParsedService;
  };

  for (const [path, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== 'object' || pathItem === null) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) continue;
      const op = operation as any;

      const resolved = resolveOpenApiOperationContract(spec, String(path), method);
      const tags: string[] = resolved?.tags?.length ? resolved.tags : (Array.isArray(op.tags) ? op.tags.map(String) : []);
      const serviceName = tags.length > 0 ? String(tags[0]) : specTitle;
      const svc = ensureService(serviceName);
      sawTaggedOperation = sawTaggedOperation || tags.length > 0;
      for (const tag of tags) {
        if (!svc.tags.includes(tag)) svc.tags.push(tag);
      }

      const authType = extractAuthType(spec, pathItem, op);
      const desc = resolved?.summary ? `${resolved.summary}. ${resolved.description || ''}`.trim() : (resolved?.description || op.description || '');
      const requestUrl = specBaseUrl ? joinExecutableUrl(specBaseUrl, String(path)) : String(path);
      const requestBody = resolved?.requestBody ?? (op.requestBody ? JSON.parse(JSON.stringify(op.requestBody)) : null);
      const responses = resolved?.responses ?? (op.responses ? JSON.parse(JSON.stringify(op.responses)) : null);
      const parameters = resolved?.parameters ?? [];
      const sourceOperation = {
        path: String(path),
        method: normalizeMethod(method),
        operationId: resolved?.operationId ?? (op.operationId ? String(op.operationId) : undefined),
        summary: resolved?.summary ?? (op.summary ? String(op.summary) : undefined),
        description: resolved?.description ?? (op.description ? String(op.description) : undefined),
        tags,
        servers: resolved?.servers ?? [],
        security: resolved?.security ?? [],
        parameters,
        requestBody,
        responses,
        requestContentTypes: resolved?.requestContentTypes ?? [],
        responseContentTypes: resolved?.responseContentTypes ?? [],
        rawPathItem: resolved?.rawPathItem ?? null,
        rawOperation: resolved?.rawOperation ?? null,
      };

      svc.operations.push({
        name: operationName(op, path, method),
        method: normalizeMethod(method),
        path: String(path),
        requestUrl,
        description: desc || '',
        authenticationType: authType,
        status: 'Active',
        sampleRequestBody: extractOpenApiSampleRequestBody({
          ...(op as Record<string, unknown>),
          requestBody,
        }),
        requiredRequestBodyFields: extractOpenApiRequiredRequestBodyFields({
          ...(op as Record<string, unknown>),
          requestBody,
        }),
        tags,
        contentTypes: sourceOperation.requestContentTypes,
        sourceOperation,
      });
    }
  }

  const result = Array.from(servicesByKey.values());
  if (result.length === 0) {
    result.push({
      name: specTitle,
      description: specDescription,
      version: specVersion,
      tags: [],
      baseUrl: specBaseUrl,
      sourceContract: JSON.parse(JSON.stringify(spec)),
      operations: [],
    });
    if (!sawTaggedOperation) {
      warnings.push('No operations found in the specification.');
    }
  }

  return result;
}

// ─── Postman Collection v2.1 extraction ───────────────────

function extractFromPostman(spec: any, warnings: string[]): ParsedService[] {
  const info = spec.info || {};
  const collectionName = String(info.name || 'Imported API');
  const collectionVersion = info.schema ? String(info.schema) : 'v2.1';
  const baseUrl = inferPostmanCollectionBaseUrl(spec);
  const variables = readPostmanVariables(spec);

  // Collect operations grouped by folder path
  const operationsByFolder = new Map<string, ParsedOperation[]>();

  function processItems(items: any[], parentPath: string = '') {
    for (const item of items) {
      const currentPath = parentPath ? `${parentPath}/${item.name}` : item.name;
      if (item.item && Array.isArray(item.item)) {
        processItems(item.item, currentPath);
      } else if (item.request) {
        const req = item.request;
        const method = normalizeMethod(req.method);
        let path = '/';
        let rawPath = '';
        let requestUrl = '';

        if (typeof req.url === 'string') {
          rawPath = req.url;
        } else if (req.url && typeof req.url === 'object') {
          rawPath = req.url.raw || (req.url.path ? req.url.path.join('/') : '') || '';
        }

        try {
          const url = new URL(rawPath);
          path = normalizeImportedPath(url.pathname);
        } catch {
          if (rawPath.startsWith('/')) {
            path = normalizeImportedPath(rawPath);
          } else if (rawPath.includes('/')) {
            path = normalizeImportedPath('/' + rawPath.substring(rawPath.indexOf('/')));
          }
        }

        requestUrl = resolvePostmanExecutableRequestUrl(req.url, baseUrl, variables) || joinExecutableUrl(baseUrl, path);

        const authType = req.auth ? mapPostmanAuth(req.auth) : 'None';
        const desc = item.description || req.description || req.summary || '';

        const folderPath = parentPath ? parentPath.replace(/^\//, '') : '';
        
        if (!operationsByFolder.has(folderPath)) {
          operationsByFolder.set(folderPath, []);
        }

        operationsByFolder.get(folderPath)!.push({
          name: String(item.name || `${method} ${path}`),
          method,
          path,
          requestUrl,
          description: desc || '',
          authenticationType: authType,
          status: 'Active',
          sampleRequestBody: extractPostmanSampleRequestBody(req as Record<string, unknown>),
          requiredRequestBodyFields: null,
          sourceOperation: {
            // Preserve Postman's URL expression separately from the resolved
            // executable URL so the client can require an environment before
            // activating a {{variable}} request.
            requestUrlTemplate: rawPath,
            requestHeaders: extractPostmanRequestHeaders(req),
            requestBody: extractPostmanRequestBody(req),
          },
        });
      }
    }
  }

  processItems(spec.item || []);

  if (operationsByFolder.size === 0) {
    warnings.push('No API operations found in the Postman collection.');
    return [];
  }

  // Create one service per folder
  const services: ParsedService[] = [];
  
  for (const [folderPath, operations] of operationsByFolder) {
    const serviceName = folderPath ? folderPath.split('/').pop()! : collectionName;
    
    services.push({
      name: serviceName,
      description: String(info.description || ''),
      version: collectionVersion,
      tags: [],
      baseUrl,
      folderPath: folderPath || undefined,
      operations,
    });
  }

  return services;
}

/** Preserve enabled Postman request headers exactly as supplied so imported
 * requests execute the same way before and after a workspace refresh. */
function extractPostmanRequestHeaders(request: Record<string, unknown>): Array<{ name: string; value: string }> {
  if (!Array.isArray(request.header)) return [];
  return request.header.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const header = entry as Record<string, unknown>;
    if (header.disabled === true) return [];
    const name = String(header.key || '').trim();
    if (!name) return [];
    return [{ name, value: String(header.value || '') }];
  });
}

/** Keep the Postman body mode and rows, not only a flattened sample payload.
 * The API editor needs this to restore the correct Body tab after refresh. */
function extractPostmanRequestBody(request: Record<string, unknown>): Record<string, unknown> | null {
  const body = request.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
}

function mapPostmanAuth(auth: any): string {
  if (!auth || !auth.type) return 'None';
  switch (String(auth.type).toLowerCase()) {
    case 'bearer':
      return 'Bearer Token';
    case 'basic':
      return 'Basic Authentication';
    case 'apikey':
      return 'API Key';
    case 'oauth2':
      return 'OAuth 2.0';
    case 'digest':
      return 'Basic Authentication';
    default:
      return 'None';
  }
}

// ─── Environment detection ──────────────────────────────

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

/** Filters Postman/OAuth variable noise (e.g. token_url paths) from environment suggestions. */
function isPlausibleEnvironmentUrl(raw: string, key: string): boolean {
  const value = raw.trim();
  if (!value || value.includes('{{') || /\s/.test(value)) return false;
  if (value.includes('=') || value.startsWith('/oauth') || value.startsWith('/api/')) return false;

  const lower = key.toLowerCase();
  const hasHttp = /^https?:\/\//i.test(value);
  const hostLike = /^[\w.-]+\.[a-z]{2,}/i.test(value) && !value.includes('/');

  if (lower.endsWith('_url') && !hasHttp) return false;
  if (lower.includes('token') && !hasHttp) return false;

  if (lower === 'issuer' || lower.includes('baseurl') || lower === 'host') {
    return hasHttp || hostLike;
  }
  if (lower.includes('url') || lower.includes('host') || lower.includes('base')) {
    return hasHttp;
  }
  if (lower === 'domain') {
    return hostLike;
  }
  return false;
}

function openApiPrimaryBaseUrl(spec: any): string {
  if (Array.isArray(spec?.servers) && spec.servers[0]?.url) {
    return normalizeBaseUrl(resolveOpenApiServerUrl(spec.servers[0], spec));
  }
  const host = String(spec?.host || '').trim();
  if (host) {
    const basePath = String(spec?.basePath || '').trim();
    const scheme = Array.isArray(spec?.schemes) && spec.schemes[0] ? String(spec.schemes[0]) : 'https';
    return normalizeBaseUrl(`${scheme}://${host}${basePath}`);
  }
  return '';
}

function readPostmanVariables(spec: any): Map<string, string> {
  const map = new Map<string, string>();
  const add = (entries: unknown) => {
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
      if (entry && typeof entry === 'object' && 'key' in entry) {
        const key = String((entry as { key: unknown }).key);
        const value = String((entry as { value?: unknown }).value ?? '').trim();
        if (key) map.set(key, value);
      }
    }
  };
  add(spec?.variable);
  add(spec?.auth?.apikey);
  return map;
}

function firstPostmanRequestOrigin(spec: any): string {
  const variables = readPostmanVariables(spec);
  let originFromRequest = '';

  const visitItems = (items: any[]) => {
    for (const item of items) {
      if (originFromRequest) return;
      if (item.item && Array.isArray(item.item)) {
        visitItems(item.item);
        continue;
      }

      const url = item.request?.url;
      if (!url) continue;

      if (typeof url === 'string') {
        const abs = url.match(/^(https?:\/\/[^\s/]+)/i);
        if (abs) {
          originFromRequest = abs[1];
          return;
        }

        const resolved = resolvePostmanVariableRef(url.split('/')[0], variables);
        if (/^https?:\/\//i.test(resolved)) {
          originFromRequest = normalizeBaseUrl(resolved);
          return;
        }
      }

      if (typeof url === 'object') {
        const raw = url.raw ? String(url.raw) : '';
        if (raw) {
          const abs = raw.match(/^(https?:\/\/[^\s/]+)/i);
          if (abs) {
            originFromRequest = abs[1];
            return;
          }
          const varPrefix = raw.match(/^\{\{([^}]+)\}\}/);
          if (varPrefix) {
            const resolved = variables.get(varPrefix[1].trim());
            if (resolved && /^https?:\/\//i.test(resolved)) {
              originFromRequest = normalizeBaseUrl(resolved);
              return;
            }
          }
        }
        if (url.protocol && url.host) {
          const protocol = Array.isArray(url.protocol) ? url.protocol[0] : url.protocol;
          const hostParts = Array.isArray(url.host) ? url.host : [url.host];
          const host = hostParts.map((p: string) => resolvePostmanVariableRef(String(p), variables)).join('.');
          if (host && /^https?:\/\//i.test(host)) {
            originFromRequest = normalizeBaseUrl(host);
            return;
          }
          if (host && !host.includes('{{') && !host.includes(' ')) {
            originFromRequest = `${protocol}://${host}`;
            return;
          }
        }
      }
    }
  };

  visitItems(spec.item || []);
  return originFromRequest ? normalizeBaseUrl(originFromRequest) : '';
}

function firstHttpUrlInVariableValues(variables: Map<string, string>): string {
  for (const value of variables.values()) {
    if (!value || value.includes('{{')) continue;
    if (/^https?:\/\//i.test(value)) {
      return normalizeBaseUrl(value);
    }
  }
  return '';
}

function joinExecutableUrl(baseUrl: string, operationPath: string): string {
  const trimmedBase = baseUrl.trim();
  const trimmedPath = normalizeImportedPath(operationPath);
  if (!trimmedBase) return trimmedPath;
  if (!trimmedPath) return trimmedBase;

  try {
    const parsed = new URL(trimmedBase);
    const basePath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : '';
    const opPath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
    return `${parsed.origin}${basePath}${opPath}`;
  } catch {
    const left = trimmedBase.endsWith('/') ? trimmedBase.slice(0, -1) : trimmedBase;
    const right = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
    return `${left}${right}`;
  }
}

function normalizeImportedPath(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const collapsed = trimmed.replace(/\/{2,}/g, '/');
  if (!collapsed.startsWith('/')) {
    return `/${collapsed}`;
  }
  return collapsed;
}

function resolvePostmanExecutableRequestUrl(url: any, baseUrl: string, variables: Map<string, string>): string {
  if (!url) return '';

  if (typeof url === 'string') {
    const resolved = replacePostmanVariables(url, variables);
    if (/^https?:\/\//i.test(resolved)) return resolved;
    // A collection can supply the service origin while a request still begins
    // with an environment-only `{{base_url}}` variable. Joining both created
    // URLs such as `https://host/{{base_url}}/users`; retain the discovered
    // service origin and join just the request path instead.
    const unresolvedBaseVariable = resolved.match(/^\{\{[^}]+\}\}(\/.*)?$/);
    if (unresolvedBaseVariable) return joinExecutableUrl(baseUrl, unresolvedBaseVariable[1] || '/');
    return joinExecutableUrl(baseUrl, resolved);
  }

  if (typeof url === 'object') {
    const raw = url.raw ? replacePostmanVariables(String(url.raw), variables) : '';
    if (raw) {
      if (/^https?:\/\//i.test(raw)) return raw;
      const absFromRaw = raw.match(/^(https?:\/\/[^/?#]+)/i);
      if (absFromRaw) return raw;
      const unresolvedBaseVariable = raw.match(/^\{\{[^}]+\}\}(\/.*)?$/);
      if (unresolvedBaseVariable) return joinExecutableUrl(baseUrl, unresolvedBaseVariable[1] || '/');
      return joinExecutableUrl(baseUrl, raw);
    }

    const protocol = url.protocol ? replacePostmanVariables(String(url.protocol), variables).replace(/:$/, '') : '';
    const hostParts = Array.isArray(url.host) ? url.host : url.host ? [url.host] : [];
    const host = hostParts.map((part: string) => replacePostmanVariables(String(part), variables)).join('.');
    const pathParts = Array.isArray(url.path) ? url.path : url.path ? [url.path] : [];
    const path = pathParts.length > 0 ? `/${pathParts.map((part: string) => replacePostmanVariables(String(part), variables)).filter(Boolean).join('/')}` : '';

    if (protocol && host) {
      return `${protocol}://${host}${path}`;
    }
    if (host) {
      return joinExecutableUrl(baseUrl, path || host);
    }
  }

  return '';
}

function replacePostmanVariables(value: string, variables: Map<string, string>): string {
  return value.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => variables.get(String(key).trim()) ?? _match);
}

function resolvePostmanVariableRef(value: string, variables: Map<string, string>): string {
  const match = value.trim().match(/^\{\{([^}]+)\}\}$/);
  if (!match) return value;
  return variables.get(match[1].trim()) ?? value;
}

function inferPostmanCollectionBaseUrl(spec: any): string {
  const requestOrigin = firstPostmanRequestOrigin(spec);
  if (requestOrigin) return requestOrigin;

  const variables = readPostmanVariables(spec);

  const fromAnyUrl = firstHttpUrlInVariableValues(variables);
  if (fromAnyUrl) return fromAnyUrl;

  const preferredKeys = [
    'baseurl',
    'base_url',
    'url',
    'host',
    'domain',
    'issuer',
    'apiurl',
    'api_url',
    'custom-url',
    'custom_url',
    'zitadel',
  ];

  for (const preferred of preferredKeys) {
    for (const [key, value] of variables) {
      if (!value || value.includes('{{')) continue;
      if (key.toLowerCase() === preferred || key.toLowerCase().includes(preferred)) {
        return normalizeBaseUrl(value);
      }
    }
  }

  return '';
}

function detectEnvironments(spec: any): DetectedEnvironment[] {
  const environments: DetectedEnvironment[] = [];
  const seen = new Set<string>();

  // OpenAPI 3.x servers
  if (Array.isArray(spec?.servers)) {
    for (const server of spec.servers) {
      if (!server.url) continue;
      const name = server.description?.trim() || `Server ${environments.length + 1}`;
      const baseUrl = server.url.trim();
      const key = `${name.toLowerCase()}-${baseUrl.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        environments.push({ name, baseUrl, description: server.description?.trim() });
      }
    }
  }

  // Swagger 2.0 host + basePath + schemes
  if (spec?.host || spec?.basePath || spec?.schemes) {
    const host = String(spec.host || '').trim();
    const basePath = String(spec.basePath || '').trim();
    const schemes = Array.isArray(spec.schemes) ? spec.schemes : ['https'];

    for (const scheme of schemes) {
      const protocol = String(scheme).trim();
      if (!host) continue;
      const baseUrl = `${protocol}://${host}${basePath}`;
      const name = `${protocol.toUpperCase()} ${host}${basePath ? ' - ' + basePath : ''}`;
      const key = name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        environments.push({ name, baseUrl });
      }
    }
  }

  // If no environments detected, add a default one
  if (environments.length === 0 && (spec?.host || spec?.servers?.length || spec?.urls)) {
    const host = String(spec.host || '').trim();
    const basePath = String(spec.basePath || '').trim();
    if (host) {
      const baseUrl = `https://${host}${basePath}`;
      environments.push({ name: 'Default', baseUrl });
    }
  }

  // Postman collection variables (common for base URL / issuer)
  if (spec?.item || spec?.info?.schema?.includes?.('postman')) {
    const requestOrigin = firstPostmanRequestOrigin(spec);
    if (requestOrigin) {
      const envKey = `request-origin-${requestOrigin.toLowerCase()}`;
      if (!seen.has(envKey)) {
        seen.add(envKey);
        environments.push({ name: 'Request origin', baseUrl: requestOrigin });
      }
    } else {
      const variables = readPostmanVariables(spec);
      for (const [key, value] of variables) {
        if (!value || value.includes('{{')) continue;
        if (!isPlausibleEnvironmentUrl(value, key)) continue;
        const baseUrl = normalizeBaseUrl(value);
        const envKey = `${key.toLowerCase()}-${baseUrl.toLowerCase()}`;
        if (!seen.has(envKey)) {
          seen.add(envKey);
          environments.push({ name: key, baseUrl });
        }
      }
      const collectionBase = inferPostmanCollectionBaseUrl(spec);
      if (collectionBase) {
        const envKey = `collection-${collectionBase.toLowerCase()}`;
        if (!seen.has(envKey)) {
          seen.add(envKey);
          environments.push({ name: 'Collection default', baseUrl: collectionBase });
        }
      }
    }
  }

  return environments;
}

// ─── GraphQL Schema (.graphql) extraction ──────────────

function parseGraphQLSchema(content: string, fileName: string, warnings: string[]): ParsedService[] {
  const schemaName = fileName.replace(/\.(graphql|gql)$/i, '') || 'GraphQL API';
  const services: ParsedService[] = [];

  const typeRegex = /type\s+(Query|Mutation|Subscription)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = typeRegex.exec(content)) !== null) {
    const typeName = match[1];
    const blockStart = match.index + match[0].length;

    // Find matching closing brace
    let depth = 1;
    let blockEnd = blockStart;
    for (let i = blockStart; i < content.length; i++) {
      if (content[i] === '{') depth++;
      if (content[i] === '}') depth--;
      if (depth === 0) {
        blockEnd = i;
        break;
      }
    }

    const body = content.substring(blockStart, blockEnd);
    const operations = parseGraphQLFields(body, typeName);

    services.push({
      name: `${schemaName} ${typeName}`,
      description: `GraphQL ${typeName} operations`,
      version: 'v1',
      tags: ['GraphQL'],
      operations,
    });
  }

  if (services.length === 0) {
    warnings.push('No Query, Mutation, or Subscription types found in the GraphQL schema.');
  }

  return services;
}

function parseGraphQLFields(body: string, typeName: string): ParsedOperation[] {
  const operations: ParsedOperation[] = [];

  const lines = body.split(/\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const fieldMatch = trimmed.match(/^(\w+)\s*(?:\([^)]*\))?\s*:\s*(.+)$/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];

      operations.push({
        name: fieldName,
        method: typeName.toUpperCase(),
        path: `/${fieldName}`,
        description: '',
        authenticationType: 'None',
        status: 'Active',
        sampleRequestBody: null,
        requiredRequestBodyFields: null,
      });
    }
  }

  return operations;
}

// ─── GraphQL Introspection JSON extraction ───────────────

function extractFromGraphQLIntrospection(spec: any, warnings: string[]): ParsedService[] {
  const schemaObj = spec.__schema;
  const queryType = schemaObj?.queryType?.name || 'Query';
  const services: ParsedService[] = [];

  const typeMap = new Map<string, any>();
  for (const t of (schemaObj?.types || [])) {
    typeMap.set(t.name, t);
  }

  for (const typeName of ['Query', 'Mutation', 'Subscription']) {
    const typeDef = typeMap.get(typeName);
    if (!typeDef || !typeDef.fields) continue;

    const operations: ParsedOperation[] = [];

    for (const field of typeDef.fields) {
      operations.push({
        name: field.name,
        method: typeName.toUpperCase(),
        path: `/${field.name}`,
        description: field.description || '',
        authenticationType: 'None',
        status: 'Active',
        sampleRequestBody: null,
        requiredRequestBodyFields: null,
      });
    }

    const svcName = typeName === 'Query' && queryType === 'Query' ? 'GraphQL API' : `GraphQL API ${typeName}`;

    services.push({
      name: svcName,
      description: `GraphQL ${typeName} operations`,
      version: 'v1',
      tags: ['GraphQL'],
      operations,
    });
  }

  if (services.length === 0) {
    warnings.push('No Query, Mutation, or Subscription types found in the GraphQL introspection.');
  }

  return services;
}

// ─── The Use Case ────────────────────────────────────────

export class ImportApiContract {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly fieldDataRuleRepository?: FieldDataRuleRepository,
    private readonly impactRepositories: ProjectRecordRepository[] = [],
  ) {}

  async execute(params: {
    projectId: string;
    fileName: string;
    content: string;
    preserveUnmatchedOperations?: boolean;
    /** Preview performs the identical reconciliation without writes. */
    preview?: boolean;
  }): Promise<ImportSummary> {
    const warnings: string[] = [];
    const content = stripBom(params.content);

    const specType = detectSpecType(content, params.fileName);

    if (specType === 'unknown') {
      warnings.push('Could not detect specification format from file extension or content.');
    }

    let parsedServices: ParsedService[] = [];
    let spec: any = null;

    try {
      if (specType === 'graphql-schema') {
        parsedServices = parseGraphQLSchema(content, params.fileName, warnings);
      } else {
        spec = parseJsonOrYaml(content, params.fileName);
        if (specType === 'openapi3' || specType === 'swagger2') {
          parsedServices = extractFromOpenApi(spec, warnings);
        } else if (specType === 'postman') {
          parsedServices = extractFromPostman(spec, warnings);
        } else if (specType === 'graphql-introspection') {
          parsedServices = extractFromGraphQLIntrospection(spec, warnings);
        } else {
          // Auto-detect from parsed content
          if (spec?.openapi) {
            parsedServices = extractFromOpenApi(spec, warnings);
          } else if (spec?.swagger) {
            parsedServices = extractFromOpenApi(spec, warnings);
          } else if (spec?.info && spec?.item) {
            parsedServices = extractFromPostman(spec, warnings);
          } else if (spec?.__schema) {
            parsedServices = extractFromGraphQLIntrospection(spec, warnings);
          } else {
            warnings.push('Specification format not recognized. Could not extract services or operations.');
          }
        }
      }
    } catch (e) {
      warnings.push(`Failed to parse file: ${e instanceof Error ? e.message : 'Parse error'}`);
      return {
        servicesImported: 0,
        servicesUpdated: 0,
        operationsImported: 0,
        operationsUpdated: 0,
        operationsRemoved: 0,
        duplicatesSkipped: 0,
        warnings,
        detectedEnvironments: [],
      };
    }

    // Detect environments from spec
    const detectedEnvironments = spec ? detectEnvironments(spec) : [];
    const fallbackBaseUrl = detectedEnvironments[0]?.baseUrl || '';
    for (const svc of parsedServices) {
      if (!svc.baseUrl && fallbackBaseUrl) {
        svc.baseUrl = fallbackBaseUrl;
      }
    }

    // 3. Persist — upsert services and replace operations for matching contracts
    let servicesImported = 0;
    let servicesUpdated = 0;
    let operationsImported = 0;
    let operationsUpdated = 0;
    let operationsRemoved = 0;
    const changes: ContractChange[] = [];
    const impacts: ContractImpact = { requirementMappings: 0, testCases: 0, testCaseVersions: 0, suites: 0, schedules: 0, runtimeLinks: 0, fieldDataRules: 0 };
    const impactedOperationIds = new Set<string>();

    const existingServices = await this.apiServiceRepository.findByProject(params.projectId);
    const reconciledServiceIds = new Set<string>();
    const isPostmanOperation = (operation: Pick<ParsedOperation, 'sourceOperation'> | ApiOperationEntity): boolean => {
      const source = operation.sourceOperation;
      return Boolean(source && typeof source === 'object' && ('requestHeaders' in source || 'requestBody' in source));
    };
    for (const svc of parsedServices) {
      let serviceEntity: ApiServiceEntity | null = null;
      const serviceBaseUrl = svc.baseUrl || fallbackBaseUrl || '';

      const matchedByImportKey = svc.importKey
        ? existingServices.find((s: any) => s.importKey === svc.importKey)
        : null;
      const matchedByName = existingServices.find(
        (s: any) => s.name.toLowerCase() === svc.name.toLowerCase() && !s.importKey,
      ) ?? null;

      if (!matchedByImportKey && !matchedByName) {
        const now = Date.now();
        serviceEntity = new ApiServiceEntity(
          randomUUID(),
          params.projectId,
          svc.name,
          svc.description,
          svc.version,
          svc.tags,
          serviceBaseUrl,
          now,
          now,
          svc.folderPath
        );
        serviceEntity.importKey = svc.importKey || null;
        serviceEntity.sourceContract = svc.sourceContract ?? null;
        if (!params.preview) await this.apiServiceRepository.create(serviceEntity);
        existingServices.push(serviceEntity);
        servicesImported++;
      } else {
        serviceEntity = matchedByImportKey || matchedByName;
        if (!serviceEntity) {
          warnings.push(`Service "${svc.name}" exists but could not be retrieved. Skipping its operations.`);
          continue;
        }
        const servicePatch = {
          description: svc.description,
          version: svc.version,
          tags: svc.tags,
          ...(serviceBaseUrl ? { baseUrl: serviceBaseUrl } : {}),
          ...(svc.folderPath !== undefined ? { folderPath: svc.folderPath } : {}),
          importKey: svc.importKey || null,
          sourceContract: svc.sourceContract ?? null,
        };
        if (!params.preview) serviceEntity = await this.apiServiceRepository.update(serviceEntity.id, servicePatch);
        servicesUpdated++;
      }

      const existingOps = await this.apiOperationRepository.findByProjectAndService(
        params.projectId,
        serviceEntity!.id,
      );
      reconciledServiceIds.add(serviceEntity!.id);
      const matchedExistingOperationIds = new Set<string>();

        for (const op of svc.operations) {
          const pathMatches = existingOps.filter((e) =>
            e.method.toUpperCase() === op.method.toUpperCase() && e.path === op.path && !matchedExistingOperationIds.has(e.id),
          );
          const match = isPostmanOperation(op)
            ? pathMatches.find((e) => e.name.trim().toLowerCase() === op.name.trim().toLowerCase()) ?? pathMatches[0]
            : pathMatches[0];
          if (match) {
          matchedExistingOperationIds.add(match.id);
          const diff = operationDiff(match, op);
          const manual = !match.sourceOperation;
          changes.push({ operationId: match.id, serviceId: serviceEntity!.id, method: op.method, path: op.path, status: diff.status, reasons: manual ? ['Manually maintained operation is preserved.', ...diff.reasons] : diff.reasons, manual, reviewRequired: diff.status === 'MATERIAL_CHANGE' || diff.status === 'BREAKING_CHANGE' });
          if (diff.status !== 'UNCHANGED') impactedOperationIds.add(match.id);
          const patch = {
            name: op.name,
            description: op.description,
            authenticationType: op.authenticationType,
            status: op.status,
            sampleRequestBody: op.sampleRequestBody,
            requiredRequestBodyFields: op.requiredRequestBodyFields,
            requestUrl: op.requestUrl,
            tags: op.tags ?? [],
            contentTypes: op.contentTypes ?? [],
            sourceOperation: match.sourceOperation && typeof match.sourceOperation === 'object'
              && 'requestEditor' in match.sourceOperation
              ? { ...(op.sourceOperation ?? {}), requestEditor: (match.sourceOperation as Record<string, unknown>).requestEditor }
              : op.sourceOperation ?? null,
          };
          // Imported operations can be refreshed. Manual operations are never overwritten by a re-import.
          if (!params.preview && !manual) await this.apiOperationRepository.update(match.id, patch);
          if (!params.preview && (diff.status === 'MATERIAL_CHANGE' || diff.status === 'BREAKING_CHANGE') && !manual) {
            await this.apiOperationRepository.update(match.id, { status: 'Review Required' });
          }
          operationsUpdated++;
        } else {
          changes.push({ serviceId: serviceEntity!.id, method: op.method, path: op.path, status: 'ADDED', reasons: ['Operation was added by the contract.'], reviewRequired: false });
          const now = Date.now();
          const operation = new ApiOperationEntity(
            randomUUID(),
            params.projectId,
            serviceEntity!.id,
            op.name,
            op.method,
            op.path,
            op.description,
            op.authenticationType,
            op.status,
            now,
            now
          );
          operation.sampleRequestBody = op.sampleRequestBody;
          operation.requiredRequestBodyFields = op.requiredRequestBodyFields;
          operation.requestUrl = op.requestUrl ?? null;
          operation.tags = op.tags ?? [];
          operation.contentTypes = op.contentTypes ?? [];
          operation.sourceOperation = op.sourceOperation ?? null;
          if (!params.preview) await this.apiOperationRepository.create(operation);
          operationsImported++;
        }
      }

      // Re-imports are intentionally non-destructive. Missing operations retain their IDs and
      // historical mappings; they become review-required rather than being deleted.
      for (const existingOp of existingOps) {
        if (!matchedExistingOperationIds.has(existingOp.id)) {
          const manual = !existingOp.sourceOperation;
          changes.push({ operationId: existingOp.id, serviceId: serviceEntity!.id, method: existingOp.method, path: existingOp.path, status: 'REMOVED', reasons: [manual ? 'Manual operation is absent from the imported contract and is preserved.' : 'Operation is absent from the imported contract.'], manual, reviewRequired: true });
          impactedOperationIds.add(existingOp.id);
          operationsRemoved++;
          if (!params.preview && !manual) await this.apiOperationRepository.update(existingOp.id, { status: 'Review Required' });
        }
      }
    }

    // A valid re-import may remove an entire OpenAPI tag/service (including an
    // empty `paths` document). Reconcile those imported services too; otherwise
    // the absence is invisible because there is no parsed service loop entry.
    for (const existingService of existingServices) {
      if (reconciledServiceIds.has(existingService.id) || !existingService.sourceContract) continue;
      const existingOps = await this.apiOperationRepository.findByProjectAndService(params.projectId, existingService.id);
      for (const existingOp of existingOps) {
        const manual = !existingOp.sourceOperation;
        changes.push({ operationId: existingOp.id, serviceId: existingService.id, method: existingOp.method, path: existingOp.path, status: 'REMOVED', reasons: [manual ? 'Manual operation is absent from the imported contract and is preserved.' : 'Operation is absent because its imported service no longer exists.'], manual, reviewRequired: true });
        impactedOperationIds.add(existingOp.id);
        operationsRemoved++;
        if (!params.preview && !manual) await this.apiOperationRepository.update(existingOp.id, { status: 'Review Required' });
      }
    }

    if (impactedOperationIds.size) {
      const hasReference = (value: unknown, operationId: string) => stable(value).includes(operationId);
      for (const repository of this.impactRepositories) {
        const records = await repository.findByProject(params.projectId);
        for (const record of records) for (const operationId of impactedOperationIds) if (hasReference(record, operationId)) {
          const kind = repository.impactKind;
          if (kind) impacts[kind]++;
          else impacts.requirementMappings++;
          break;
        }
      }
      if (this.fieldDataRuleRepository) {
        const rules = await this.fieldDataRuleRepository.findByProject(params.projectId);
        for (const rule of rules) if (impactedOperationIds.has(rule.input.operationId)) {
          impacts.fieldDataRules++;
          const change = changes.find((item) => item.operationId === rule.input.operationId);
          // TD-4.2: accepted rules survive non-material changes; only material/removal requires review.
          if (!params.preview && change && ['MATERIAL_CHANGE', 'BREAKING_CHANGE', 'REMOVED'].includes(change.status)) {
            await this.fieldDataRuleRepository.update(rule.id, { status: 'REVIEW_REQUIRED', reviewMetadata: { reason: `Contract ${change.status.toLowerCase()}` } });
          }
        }
      }
    }

    if (servicesImported === 0 && servicesUpdated === 0 && warnings.length === 0 && parsedServices.length === 0) {
      warnings.push('No services or operations were found in the uploaded file.');
    }

    const summary = {
      servicesImported,
      servicesUpdated,
      operationsImported,
      operationsUpdated,
      operationsRemoved,
      duplicatesSkipped: 0,
      warnings,
      detectedEnvironments,
      changes,
      impacts,
      preview: Boolean(params.preview),
    };

    const hadChanges =
      servicesImported > 0
      || servicesUpdated > 0
      || operationsImported > 0
      || operationsUpdated > 0
      || operationsRemoved > 0;

    if (this.eventPublisher && hadChanges && !params.preview) {
      await this.eventPublisher.publish({
        type: 'IMPORTED',
        module: 'api',
        entityId: randomUUID(),
        projectId: params.projectId,
        entityType: 'ApiContract',
        newValue: { fileName: params.fileName },
        metadata: {
          status: 'Completed',
          servicesImported,
          servicesUpdated,
          operationsImported,
          operationsUpdated,
          operationsRemoved,
        },
      });
    }

    return summary;
  }
}

export default ImportApiContract;
