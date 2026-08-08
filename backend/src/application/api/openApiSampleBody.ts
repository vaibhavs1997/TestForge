/** Build a sample JSON request body from OpenAPI operation requestBody or Postman body. */

function sampleValueForSchema(schema: Record<string, unknown> | null | undefined): unknown {
  if (!schema || typeof schema !== 'object') return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  const type = schema.type as string | undefined;
  if (type === 'string') {
    const format = schema.format as string | undefined;
    if (format === 'email') return 'user@example.com';
    if (format === 'date') return '2025-01-01';
    if (format === 'date-time') return '2025-01-01T00:00:00.000Z';
    if (format === 'uuid') return '00000000-0000-4000-8000-000000000001';
    return 'string';
  }
  if (type === 'integer' || type === 'number') return 1;
  if (type === 'boolean') return true;
  if (type === 'array') {
    const items = schema.items as Record<string, unknown> | undefined;
    const item = sampleValueForSchema(items);
    return item !== null && item !== undefined ? [item] : [];
  }
  if (type === 'object' || schema.properties) {
    return sampleObjectFromSchema(schema);
  }
  return null;
}

function sampleObjectFromSchema(schema: Record<string, unknown>): Record<string, unknown> | null {
  const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!props) return null;
  const out: Record<string, unknown> = {};
  for (const [key, propSchema] of Object.entries(props)) {
    const value = sampleValueForSchema(propSchema);
    if (value !== null && value !== undefined) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function extractOpenApiSampleRequestBody(operation: Record<string, unknown>): Record<string, unknown> | null {
  const requestBody = operation.requestBody as Record<string, unknown> | undefined;
  if (!requestBody) return null;

  const content = requestBody.content as Record<string, Record<string, unknown>> | undefined;
  if (!content) return null;

  const jsonMedia =
    content['application/json'] ||
    content['application/*+json'] ||
    Object.values(content)[0];

  if (!jsonMedia) return null;

  if (jsonMedia.example && typeof jsonMedia.example === 'object' && !Array.isArray(jsonMedia.example)) {
    return jsonMedia.example as Record<string, unknown>;
  }

  const examples = jsonMedia.examples as Record<string, { value?: unknown }> | undefined;
  if (examples) {
    const first = Object.values(examples)[0];
    if (first?.value && typeof first.value === 'object' && !Array.isArray(first.value)) {
      return first.value as Record<string, unknown>;
    }
  }

  const schema = jsonMedia.schema as Record<string, unknown> | undefined;
  if (schema?.example && typeof schema.example === 'object' && !Array.isArray(schema.example)) {
    return schema.example as Record<string, unknown>;
  }

  return sampleObjectFromSchema(schema ?? {}) ?? null;
}

/** Property names listed in the request body schema `required` array (OpenAPI 3). */
export function extractOpenApiRequiredRequestBodyFields(
  operation: Record<string, unknown>,
): string[] | null {
  const requestBody = operation.requestBody as Record<string, unknown> | undefined;
  if (!requestBody) return null;

  const content = requestBody.content as Record<string, Record<string, unknown>> | undefined;
  if (!content) return null;

  const jsonMedia =
    content['application/json'] ||
    content['application/*+json'] ||
    Object.values(content)[0];

  if (!jsonMedia) return null;

  const schema = jsonMedia.schema as Record<string, unknown> | undefined;
  if (!schema) return null;

  const required = schema.required;
  if (!Array.isArray(required)) return null;

  const names = required.filter((r): r is string => typeof r === 'string' && r.trim().length > 0);
  return names.length > 0 ? names : null;
}

export function extractPostmanSampleRequestBody(request: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!request) return null;
  const body = request.body as Record<string, unknown> | undefined;
  if (!body) return null;

  const mode = body.mode as string | undefined;
  if (mode === 'raw' && typeof body.raw === 'string') {
    const raw = body.raw.trim();
    if (raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }

  if (mode === 'urlencoded' || mode === 'formdata') {
    const out: Record<string, unknown> = {};
    const rows = (body[mode] as Array<{ key?: string; value?: string }>) ?? [];
    for (const row of rows) {
      if (row.key) out[row.key] = row.value ?? '';
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  return null;
}
