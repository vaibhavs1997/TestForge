import type { SecretStore } from '../../domain/security/SecretStore.js';
import { isSecretReference } from '../../domain/security/SecretStore.js';

/** Resolves references into a transient copy; it never mutates or persists the resolved input. */
export class SecretResolutionService {
  constructor(private readonly secrets: SecretStore) {}
  async resolve<T>(value: T): Promise<T> {
    if (isSecretReference(value)) { const secret = await this.secrets.get(value); if (secret === null) throw new Error(`Secret ${value.secretRef} could not be resolved`); return secret as T; }
    if (Array.isArray(value)) return Promise.all(value.map((item) => this.resolve(item))) as Promise<T>;
    if (!value || typeof value !== 'object') return value;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) result[key] = await this.resolve(item);
    return result as T;
  }
  async values(value: unknown): Promise<string[]> {
    if (isSecretReference(value)) { const secret = await this.secrets.get(value); return secret === null ? [] : [secret]; }
    if (Array.isArray(value)) return (await Promise.all(value.map((item) => this.values(item)))).flat();
    if (!value || typeof value !== 'object') return [];
    return (await Promise.all(Object.values(value as Record<string, unknown>).map((item) => this.values(item)))).flat();
  }
}
