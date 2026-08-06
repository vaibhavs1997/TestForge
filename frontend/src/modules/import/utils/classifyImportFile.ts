export type ImportFileKind = 'api-contract' | 'environment' | 'unknown';

export interface ClassifiedFile {
  id: string;
  file: File;
  kind: ImportFileKind;
  reason: string;
}

function classifyFromContent(text: string, fileName: string): { kind: ImportFileKind; reason: string } {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.graphql') || lower.endsWith('.gql')) {
    return { kind: 'api-contract', reason: 'GraphQL schema' };
  }
  if (lower.endsWith('.env') || lower.endsWith('.env.local')) {
    return { kind: 'environment', reason: '.env file' };
  }
  if (lower.includes('postman_environment')) {
    return { kind: 'environment', reason: 'Postman environment export' };
  }
  if (lower.includes('postman_collection') || lower.endsWith('.postman_collection.json')) {
    return { kind: 'api-contract', reason: 'Postman collection' };
  }

  const trimmed = text.replace(/^\uFEFF/, '').trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const schema = String((parsed.info as { schema?: string } | undefined)?.schema ?? '');
      if (schema.includes('postman.com/json/collection')) {
        return { kind: 'api-contract', reason: 'Postman collection' };
      }
      if (schema.includes('environment') || (Array.isArray(parsed.values) && !parsed.item)) {
        return { kind: 'environment', reason: 'Postman environment JSON' };
      }
      if (parsed.openapi || parsed.swagger) {
        return { kind: 'api-contract', reason: 'OpenAPI / Swagger' };
      }
      if (Array.isArray(parsed.environments)) {
        return { kind: 'environment', reason: 'Multi-environment JSON' };
      }
      if (Array.isArray(parsed.item) && parsed.info) {
        return { kind: 'api-contract', reason: 'Postman collection (items)' };
      }
      if (parsed.__type === 'environment' || (parsed.name && parsed.values && !parsed.paths)) {
        return { kind: 'environment', reason: 'Environment JSON' };
      }
    } catch {
      // fall through
    }
  }

  if (/^\s*openapi\s*:/m.test(trimmed) || /^\s*swagger\s*:/m.test(trimmed) || trimmed.includes('\npaths:')) {
    return { kind: 'api-contract', reason: 'OpenAPI / Swagger (YAML)' };
  }

  if (/^[A-Za-z_][A-Za-z0-9_.-]*\s*=/m.test(trimmed) && !trimmed.startsWith('{')) {
    return { kind: 'environment', reason: 'Key=value environment file' };
  }

  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    return { kind: 'api-contract', reason: 'YAML (assumed API spec)' };
  }
  if (lower.endsWith('.json')) {
    return { kind: 'api-contract', reason: 'JSON (assumed API spec)' };
  }

  return { kind: 'unknown', reason: 'Unknown — set type manually' };
}

export async function classifyImportFile(file: File): Promise<{ kind: ImportFileKind; reason: string }> {
  const text = await file.text();
  return classifyFromContent(text, file.name);
}

export async function classifyImportFiles(files: File[]): Promise<ClassifiedFile[]> {
  const results: ClassifiedFile[] = [];
  for (const file of files) {
    const { kind, reason } = await classifyImportFile(file);
    results.push({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      kind,
      reason,
    });
  }
  return results;
}
