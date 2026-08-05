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

// ─── DTOs ────────────────────────────────────────────────

export interface ImportSummary {
  servicesImported: number;
  operationsImported: number;
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
}

interface ParsedService {
  name: string;
  description: string;
  version: string;
  tags: string[];
  operations: ParsedOperation[];
}

// ─── Spec type detection ─────────────────────────────────

type SpecType = 'openapi3' | 'swagger2' | 'postman' | 'graphql-schema' | 'graphql-introspection' | 'unknown';

function detectSpecType(content: string, fileName: string): SpecType {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'graphql' || ext === 'gql') return 'graphql-schema';

  if (ext === 'json') {
    try {
      const parsed = JSON.parse(content);
      return detectFromObject(parsed);
    } catch {
      return 'unknown';
    }
  }

  if (ext === 'yaml' || ext === 'yml') {
    try {
      const parsed = yaml.load(content);
      if (typeof parsed === 'object' && parsed !== null) {
        return detectFromObject(parsed as Record<string, unknown>);
      }
    } catch {
      return 'unknown';
    }
  }

  // Fallback: auto-detect from content
  try {
    const parsed = JSON.parse(content);
    return detectFromObject(parsed);
  } catch {
    if (/type\s+(Query|Mutation|Subscription)\s*\{/.test(content)) {
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
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'json') return JSON.parse(content);
  try {
    return JSON.parse(content);
  } catch {
    return yaml.load(content);
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
      });
    }
  }

  const result = Array.from(servicesByTag.values());

  if (allTags.length === 0 && result.length === 0) {
    result.push({
      name: specTitle,
      description: specDescription,
      version: specVersion,
      tags: [],
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
    private readonly apiOperationRepository: ApiOperationRepository
  ) {}

  async execute(params: {
    projectId: string;
    fileName: string;
    content: string;
  }): Promise<ImportSummary> {
    const warnings: string[] = [];

    const specType = detectSpecType(params.content, params.fileName);

    if (specType === 'unknown') {
      warnings.push('Could not detect specification format from file extension or content.');
    }

    let parsedServices: ParsedService[] = [];
    let spec: any = null;

    try {
      if (specType === 'graphql-schema') {
        parsedServices = parseGraphQLSchema(params.content, params.fileName, warnings);
      } else {
        spec = parseJsonOrYaml(params.content, params.fileName);
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
      return { servicesImported: 0, operationsImported: 0, duplicatesSkipped: 0, warnings, detectedEnvironments: [] };
    }

    // Detect environments from spec
    const detectedEnvironments = spec ? detectEnvironments(spec) : [];

    // 3. Persist — skip duplicates
    let servicesImported = 0;
    let operationsImported = 0;
    let duplicatesSkipped = 0;

    for (const svc of parsedServices) {
      let serviceEntity: ApiServiceEntity | null = null;

      const exists = await this.apiServiceRepository.existsByName(svc.name, params.projectId);
      if (!exists) {
        const now = Date.now();
        serviceEntity = new ApiServiceEntity(
          randomUUID(),
          params.projectId,
          svc.name,
          svc.description,
          svc.version,
          svc.tags,
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
      }

      // Check for duplicate operations (same service + method + path)
      const existingOps = await this.apiOperationRepository.findByService(serviceEntity!.id);

      for (const op of svc.operations) {
        const isDuplicate = existingOps.some(
          (e: any) => e.method === op.method && e.path === op.path
        );
        if (isDuplicate) {
          duplicatesSkipped++;
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
          await this.apiOperationRepository.create(operation);
          operationsImported++;
        }
      }
    }

    if (servicesImported === 0 && warnings.length === 0 && parsedServices.length === 0) {
      warnings.push('No services or operations were found in the uploaded file.');
    }

    return { servicesImported, operationsImported, duplicatesSkipped, warnings, detectedEnvironments };
  }
}

export default ImportApiContract;
