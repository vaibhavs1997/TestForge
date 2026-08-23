import { createHash } from 'node:crypto';
import type { SecretReference, SecretStore } from '../../domain/security/SecretStore.js';
import { isSecretReference } from '../../domain/security/SecretStore.js';

const SECRET_KEY = /(token|secret|password|api.?key|authorization|credential|private.?key|access.?key)/i;
const AUTH_PUBLIC_FIELDS = new Set(['type', 'scheme', 'name', 'granttype', 'scopes', 'clientid', 'in', 'prefix']);

function secretId(projectId: string, environmentId: string, path: string): string {
  const digest = createHash('sha256').update(`${projectId}:${environmentId}:${path}`).digest('hex').slice(0, 24);
  return `environment-${digest}`;
}

async function persistValue(
  value: unknown,
  path: string,
  projectId: string,
  environmentId: string,
  secrets: SecretStore,
  sensitive: boolean,
): Promise<unknown> {
  if (isSecretReference(value)) return value;
  if (typeof value === 'string' && sensitive && value.length > 0) {
    const id = secretId(projectId, environmentId, path);
    const existing = await secrets.metadata(id);
    if (existing) await secrets.update(id, value);
    else await secrets.set({ id, projectId, value, classification: 'CREDENTIAL' });
    return { secretRef: id } satisfies SecretReference;
  }
  if (Array.isArray(value)) return Promise.all(value.map((item, index) => persistValue(item, `${path}.${index}`, projectId, environmentId, secrets, sensitive)));
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const keyIsSensitive = sensitive || (SECRET_KEY.test(key) && !AUTH_PUBLIC_FIELDS.has(key.toLowerCase()));
    result[key] = await persistValue(item, `${path}.${key}`, projectId, environmentId, secrets, keyIsSensitive);
  }
  return result;
}

/** Converts reusable environment credentials into server-side references. */
export async function persistEnvironmentSecrets(input: {
  projectId: string;
  environmentId: string;
  authentication?: unknown;
  variables?: Record<string, unknown>;
}, secrets: SecretStore): Promise<{ authentication?: unknown; variables?: Record<string, unknown> }> {
  const result: { authentication?: unknown; variables?: Record<string, unknown> } = {};
  if (input.authentication !== undefined) {
    result.authentication = await persistValue(input.authentication, 'authentication', input.projectId, input.environmentId, secrets, false);
  }
  if (input.variables !== undefined) {
    result.variables = await persistValue(input.variables, 'variables', input.projectId, input.environmentId, secrets, false) as Record<string, unknown>;
  }
  return result;
}

/** API read model: references and benign configuration only, never values. */
export function maskEnvironmentSecrets<T>(value: T): T {
  if (isSecretReference(value)) return { secretRef: value.secretRef, masked: true } as T;
  if (Array.isArray(value)) return value.map(maskEnvironmentSecrets) as T;
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SECRET_KEY.test(key) && typeof item === 'string' ? { masked: true } : maskEnvironmentSecrets(item);
  }
  return result as T;
}
