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
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { EventPublisher } from '../EventPublisher';
import { extractOpenApiSampleRequestBody, extractPostmanSampleRequestBody } from './openApiSampleBody';

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
  description: string;
  authenticationType: string;
  status: string;
  sampleRequestBody: Record<string, unknown> | null;
}

interface ParsedService {
  name: string;
  description: string;
  version: string;
  tags: string[];
  baseUrl?: string;
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

function extractAuthType(spec: any, operation: any): string {
  const schemes: Record<string, any> = spec?.components?.securitySchemes || spec?.securityDefinitions || {};
  const opSecurity: any[] = operation?.security ?? spec?.security ?? [];

  const allSecurity = [...opSecurity, ...(spec?.security ?? [])];
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

  // Collect all tags from the spec
  const allTags: string[] = [];
  for (const pathItem of Object.values(paths)) {
    if (typeof pathItem !== 'object' || pathItem === null) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!(typeof operation === 'object' && operation !== null)) continue;
      const tags: string[] = (operation as any).tags || [];
      for (const t of tags) {
        if (!allTags.includes(String(t))) allTags.push(String(t));
      }
    }
  }

  // Group operations by their first tag (or spec title if no tags)
  const servicesByTag: Map<string, ParsedService> = new Map();

  const ensureService = (tagName: string): ParsedService => {
    if (!servicesByTag.has(tagName)) {
      servicesByTag.set(tagName, {
        name: tagName,
        description: '',
        version: specVersion,
        tags: [],
        operations: [],
      });
    }
    return servicesByTag.get(tagName) as ParsedService;
  };

  // If no tags at all, create a default service with the spec title
  if (allTags.length === 0) {
    const defaultSvc = ensureService(specTitle);
    defaultSvc.description = specDescription;
  }

  for (const tag of allTags) {
    const svc = servicesByTag.get(String(tag));
    if (svc) svc.tags.push(String(tag));
  }

  for (const [path, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== 'object' || pathItem === null) continue;

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) continue;
      const op = operation as any;

      const tags: string[] = op.tags || [];
      const serviceName = tags.length > 0 ? String(tags[0]) : specTitle;
      const svc = ensureService(serviceName);

      const authType = extractAuthType(spec, op);
      const desc = op.summary ? `${op.summary}. ${op.description || ''}`.trim() : (op.description || '');

      svc.operations.push({
        name: operationName(op, path, method),
        method: normalizeMethod(method),
        path: String(path),
        description: desc || '',
        authenticationType: authType,
        status: 'Active',
        sampleRequestBody: extractOpenApiSampleRequestBody(op as Record<string, unknown>),
      });
    }
  }

  const result = Array.from(servicesByTag.values());
  const specBaseUrl = openApiPrimaryBaseUrl(spec);
  if (specBaseUrl) {
    for (const svc of result) {
      if (!svc.baseUrl) svc.baseUrl = specBaseUrl;
    }
  }

  if (allTags.length === 0 && result.length === 0) {
    result.push({
      name: specTitle,
      description: specDescription,
      version: specVersion,
      tags: [],
      baseUrl: specBaseUrl,
      operations: [],
    });
    warnings.push('No operations found in the specification.');
  }

  return result;
}

// ─── Postman Collection v2.1 extraction ───────────────────

function extractFromPostman(spec: any, warnings: string[]): ParsedService[] {
  const info = spec.info || {};
  const collectionName = String(info.name || 'Imported API');
  const collectionVersion = info.schema ? String(info.schema) : 'v2.1';

  const svc: ParsedService = {
    name: collectionName,
    description: String(info.description || ''),
    version: collectionVersion,
    tags: [],
    baseUrl: inferPostmanCollectionBaseUrl(spec),
    operations: [],
  };

  function processItems(items: any[]) {
    for (const item of items) {
      if (item.item && Array.isArray(item.item)) {
        processItems(item.item);
      } else if (item.request) {
        const req = item.request;
        const method = normalizeMethod(req.method);
        let path = '/';
        let rawPath = '';

        if (typeof req.url === 'string') {
          rawPath = req.url;
        } else if (req.url && typeof req.url === 'object') {
          rawPath = req.url.raw || (req.url.path ? req.url.path.join('/') : '') || '';
        }

        try {
          const url = new URL(rawPath);
          path = url.pathname;
        } catch {
          if (rawPath.startsWith('/')) {
            path = rawPath;
          } else if (rawPath.includes('/')) {
            path = '/' + rawPath.substring(rawPath.indexOf('/'));
          }
        }

        const authType = req.auth ? mapPostmanAuth(req.auth) : 'None';
        const desc = item.description || req.description || req.summary || '';

        svc.operations.push({
          name: String(item.name || `${method} ${path}`),
          method,
          path,
          description: desc || '',
          authenticationType: authType,
          status: 'Active',
          sampleRequestBody: extractPostmanSampleRequestBody(req as Record<string, unknown>),
        });
      }
    }
  }

  processItems(spec.item || []);

  if (svc.operations.length === 0) {
    warnings.push('No API operations found in the Postman collection.');
  }

  return [svc];
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
    return normalizeBaseUrl(String(spec.servers[0].url));
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

function firstHttpUrlInVariableValues(variables: Map<string, string>): string {
  for (const value of variables.values()) {
    if (!value || value.includes('{{')) continue;
    if (/^https?:\/\//i.test(value)) {
      return normalizeBaseUrl(value);
    }
  }
  return '';
}

function resolvePostmanVariableRef(value: string, variables: Map<string, string>): string {
  const match = value.trim().match(/^\{\{([^}]+)\}\}$/);
  if (!match) return value;
  return variables.get(match[1].trim()) ?? value;
}

function inferPostmanCollectionBaseUrl(spec: any): string {
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
  ) {}

  async execute(params: {
    projectId: string;
    fileName: string;
    content: string;
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

    const operationKey = (method: string, path: string) =>
      `${method.toUpperCase()}:${path}`;

    for (const svc of parsedServices) {
      let serviceEntity: ApiServiceEntity | null = null;

      const exists = await this.apiServiceRepository.existsByName(svc.name, params.projectId);
      const serviceBaseUrl = svc.baseUrl || fallbackBaseUrl || '';
      if (!exists) {
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
          now
        );
        await this.apiServiceRepository.create(serviceEntity);
        servicesImported++;
      } else {
        const existing = await this.apiServiceRepository.findByProject(params.projectId);
        serviceEntity = existing.find((s: any) => s.name.toLowerCase() === svc.name.toLowerCase()) ?? null;
        if (!serviceEntity) {
          warnings.push(`Service "${svc.name}" exists but could not be retrieved. Skipping its operations.`);
          continue;
        }
        serviceEntity = await this.apiServiceRepository.update(serviceEntity.id, {
          description: svc.description,
          version: svc.version,
          tags: svc.tags,
          ...(serviceBaseUrl ? { baseUrl: serviceBaseUrl } : {}),
        });
        servicesUpdated++;
      }

      const existingOps = await this.apiOperationRepository.findByProjectAndService(
        params.projectId,
        serviceEntity!.id,
      );
      const importedKeys = new Set<string>();

      for (const op of svc.operations) {
        importedKeys.add(operationKey(op.method, op.path));
        const match = existingOps.find(
          (e) =>
            e.method.toUpperCase() === op.method.toUpperCase() && e.path === op.path,
        );
        if (match) {
          await this.apiOperationRepository.update(match.id, {
            name: op.name,
            description: op.description,
            authenticationType: op.authenticationType,
            status: op.status,
            sampleRequestBody: op.sampleRequestBody,
          });
          operationsUpdated++;
        } else {
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
          await this.apiOperationRepository.create(operation);
          operationsImported++;
        }
      }

      for (const existingOp of existingOps) {
        if (!importedKeys.has(operationKey(existingOp.method, existingOp.path))) {
          await this.apiOperationRepository.delete(existingOp.id);
          operationsRemoved++;
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
    };

    const hadChanges =
      servicesImported > 0
      || servicesUpdated > 0
      || operationsImported > 0
      || operationsUpdated > 0
      || operationsRemoved > 0;

    if (this.eventPublisher && hadChanges) {
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
