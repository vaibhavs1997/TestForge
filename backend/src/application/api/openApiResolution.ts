type JsonObject = Record<string, any>;

function isPlainObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function getJsonPointerTarget(root: JsonObject, ref: string): unknown {
  if (!ref.startsWith('#/')) return undefined;
  const segments = ref.slice(2).split('/').map(decodePointerSegment);
  let current: any = root;
  for (const segment of segments) {
    if (!isPlainObject(current) && !Array.isArray(current)) return undefined;
    current = (current as any)?.[segment];
    if (current === undefined) return undefined;
  }
  return current;
}

function uniqueStrings(values: unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const text = String(value);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

function mergeSchemaObjects(base: JsonObject, addition: JsonObject): JsonObject {
  const merged: JsonObject = { ...base };

  for (const [key, value] of Object.entries(addition)) {
    if (value === undefined) continue;

    if (key === 'required' && Array.isArray(value)) {
      merged.required = uniqueStrings([...(Array.isArray(merged.required) ? merged.required : []), ...value]);
      continue;
    }

    if (key === 'properties' && isPlainObject(value)) {
      merged.properties = {
        ...(isPlainObject(merged.properties) ? merged.properties : {}),
        ...value,
      };
      continue;
    }

    if (key === 'items' && isPlainObject(value) && isPlainObject(merged.items)) {
      merged.items = mergeSchemaObjects(merged.items, value);
      continue;
    }

    if (key === 'allOf' || key === 'oneOf' || key === 'anyOf') {
      merged[key] = value;
      continue;
    }

    if (key === 'enum' && Array.isArray(value)) {
      merged.enum = uniqueStrings([...(Array.isArray(merged.enum) ? merged.enum : []), ...value]);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function resolveSchemaNode(node: unknown, root: JsonObject, stack: Set<string> = new Set()): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => resolveSchemaNode(item, root, stack));
  }

  if (!isPlainObject(node)) {
    return node;
  }

  if (typeof node.$ref === 'string') {
    const ref = node.$ref;
    if (stack.has(ref)) return { $ref: ref };
    const target = getJsonPointerTarget(root, ref);
    if (target === undefined) return cloneValue(node);
    stack.add(ref);
    const resolvedTarget = resolveSchemaNode(target, root, stack);
    stack.delete(ref);

    const siblings = { ...node };
    delete siblings.$ref;
    const resolvedSiblings = resolveSchemaNode(siblings, root, stack);

    if (isPlainObject(resolvedTarget) && isPlainObject(resolvedSiblings)) {
      return mergeSchemaObjects(cloneValue(resolvedTarget), resolvedSiblings);
    }
    return resolvedSiblings;
  }

  const output: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (value === undefined) continue;
    if (key === 'allOf' && Array.isArray(value)) {
      const parts = value.map((item) => resolveSchemaNode(item, root, stack)).filter(isPlainObject);
      if (parts.length > 0) {
        output.allOf = parts;
        const merged = parts.reduce((acc, part) => mergeSchemaObjects(acc, part), {});
        Object.assign(output, mergeSchemaObjects(merged, { ...node, allOf: undefined }));
      }
      continue;
    }
    if (key === 'oneOf' || key === 'anyOf') {
      output[key] = Array.isArray(value) ? value.map((item) => resolveSchemaNode(item, root, stack)) : value;
      continue;
    }
    if (key === 'properties' && isPlainObject(value)) {
      output.properties = Object.fromEntries(
        Object.entries(value).map(([propKey, propValue]) => [propKey, resolveSchemaNode(propValue, root, stack)]),
      );
      continue;
    }
    if (key === 'items') {
      output.items = resolveSchemaNode(value, root, stack);
      continue;
    }
    if (key === 'additionalProperties' || key === 'not' || key === 'if' || key === 'then' || key === 'else') {
      output[key] = resolveSchemaNode(value, root, stack);
      continue;
    }
    if (key === 'content' && isPlainObject(value)) {
      output.content = Object.fromEntries(
        Object.entries(value).map(([contentType, media]) => [contentType, resolveSchemaNode(media, root, stack)]),
      );
      continue;
    }
    if (key === 'schema' && isPlainObject(value)) {
      output.schema = resolveSchemaNode(value, root, stack);
      continue;
    }
    if (key === 'examples' && isPlainObject(value)) {
      output.examples = Object.fromEntries(
        Object.entries(value).map(([exampleKey, exampleValue]) => [exampleKey, resolveSchemaNode(exampleValue, root, stack)]),
      );
      continue;
    }
    output[key] = resolveSchemaNode(value, root, stack);
  }
  return output;
}

function normalizeParameter(param: unknown, root: JsonObject): JsonObject | null {
  const resolved = resolveSchemaNode(param, root);
  return isPlainObject(resolved) ? resolved : null;
}

function mergeParameters(pathParameters: unknown, operationParameters: unknown, root: JsonObject): JsonObject[] {
  const merged = new Map<string, JsonObject>();
  const add = (items: unknown) => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      const normalized = normalizeParameter(item, root);
      if (!normalized) continue;
      const key = `${String(normalized.in || '').toLowerCase()}:${String(normalized.name || '').toLowerCase()}`;
      merged.set(key, normalized);
    }
  };

  add(pathParameters);
  add(operationParameters);
  return [...merged.values()];
}

function resolveRequestBody(requestBody: unknown, root: JsonObject): JsonObject | null {
  const resolved = resolveSchemaNode(requestBody, root);
  return isPlainObject(resolved) ? resolved : null;
}

function resolveResponses(responses: unknown, root: JsonObject): JsonObject | null {
  const resolved = resolveSchemaNode(responses, root);
  return isPlainObject(resolved) ? resolved : null;
}

function collectContentTypes(container: unknown): string[] {
  if (!isPlainObject(container) || !isPlainObject(container.content)) return [];
  return Object.keys(container.content);
}

function collectResponseContentTypes(responses: unknown): string[] {
  if (!isPlainObject(responses)) return [];
  const out = new Set<string>();
  for (const response of Object.values(responses)) {
    if (isPlainObject(response) && isPlainObject(response.content)) {
      for (const contentType of Object.keys(response.content)) {
        out.add(contentType);
      }
    }
  }
  return [...out];
}

export interface ResolvedOpenApiOperationContract {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags: string[];
  servers: JsonObject[];
  security: JsonObject[];
  parameters: JsonObject[];
  requestBody: JsonObject | null;
  responses: JsonObject | null;
  requestContentTypes: string[];
  responseContentTypes: string[];
  rawPathItem: JsonObject | null;
  rawOperation: JsonObject | null;
}

export function resolveOpenApiOperationContract(spec: JsonObject, path: string, method: string): ResolvedOpenApiOperationContract | null {
  const pathItem = spec.paths?.[path];
  if (!isPlainObject(pathItem)) return null;
  const operation = pathItem[method.toLowerCase()];
  if (!isPlainObject(operation)) return null;

  const resolvedPathItem = resolveSchemaNode(pathItem, spec);
  const resolvedOperation = resolveSchemaNode(operation, spec);
  const mergedParameters = mergeParameters(pathItem.parameters, operation.parameters, spec);
  const requestBody = resolveRequestBody(operation.requestBody, spec);
  const responses = resolveResponses(operation.responses, spec);
  const servers = Array.isArray(operation.servers)
    ? cloneValue(operation.servers)
    : Array.isArray(pathItem.servers)
      ? cloneValue(pathItem.servers)
      : Array.isArray(spec.servers)
        ? cloneValue(spec.servers)
        : [];
  const security = Array.isArray(operation.security)
    ? cloneValue(operation.security)
    : Array.isArray(pathItem.security)
      ? cloneValue(pathItem.security)
      : Array.isArray(spec.security)
        ? cloneValue(spec.security)
        : [];

  return {
    path,
    method: method.toUpperCase(),
    operationId: typeof operation.operationId === 'string' ? operation.operationId : undefined,
    summary: typeof operation.summary === 'string' ? operation.summary : undefined,
    description: typeof operation.description === 'string' ? operation.description : undefined,
    tags: Array.isArray(operation.tags) ? operation.tags.map(String) : [],
    servers,
    security,
    parameters: mergedParameters,
    requestBody,
    responses,
    requestContentTypes: collectContentTypes(operation.requestBody),
    responseContentTypes: collectResponseContentTypes(operation.responses),
    rawPathItem: isPlainObject(resolvedPathItem) ? resolvedPathItem : null,
    rawOperation: isPlainObject(resolvedOperation) ? resolvedOperation : null,
  };
}

export function buildOpenApiServiceImportKey(params: {
  specTitle: string;
  serviceName: string;
  folderPath?: string;
}): string {
  return [
    'openapi3',
    params.specTitle.trim().toLowerCase(),
    params.serviceName.trim().toLowerCase(),
    (params.folderPath || '').trim().toLowerCase(),
  ].join('|');
}
