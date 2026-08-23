import { randomUUID } from 'node:crypto';
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository.js';
import { EnvironmentEntity, type EnvironmentExecutionPolicy, type EnvironmentTier, normalizeEnvironmentTier } from '../../domain/environment/EnvironmentEntity.js';
import { DEFAULT_TIMEOUT_MS } from '../../constants/defaults.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';
import type { SecretStore } from '../../domain/security/SecretStore.js';
import { persistEnvironmentSecrets } from './EnvironmentSecretPersistence.js';

export interface UpsertEnvironmentInput {
  name: string;
  baseUrl: string;
  description?: string;
  authentication?: unknown;
  variables?: Record<string, string>;
  timeout?: number;
  tier?: EnvironmentTier;
  executionPolicy?: Partial<EnvironmentExecutionPolicy>;
}

export interface UpsertEnvironmentsResult {
  created: number;
  updated: number;
  environments: EnvironmentEntity[];
}

export class UpsertEnvironments {
  constructor(private readonly environmentRepository: EnvironmentRepository, private readonly secretStore?: SecretStore) {}

  async execute(params: {
    projectId: string;
    items: UpsertEnvironmentInput[];
  }): Promise<UpsertEnvironmentsResult> {
    const sanitized: UpsertEnvironmentInput[] = [];
    for (const item of params.items) {
      const name = ValidationHelpers.validateRequired(item.name, 'Environment Name');
      const baseUrl = ValidationHelpers.validateRequired(item.baseUrl, 'Base URL');
      const environmentId = randomUUID();
      const persistedSecrets = this.secretStore
        ? await persistEnvironmentSecrets({ projectId: params.projectId, environmentId, authentication: item.authentication, variables: item.variables }, this.secretStore)
        : { authentication: item.authentication, variables: item.variables };
      sanitized.push({
        ...item,
        name,
        baseUrl,
        description: ValidationHelpers.trimString(item.description),
        authentication: persistedSecrets.authentication,
        variables: persistedSecrets.variables as Record<string, string> ?? {},
        timeout: item.timeout && item.timeout > 0 ? item.timeout : DEFAULT_TIMEOUT_MS,
        tier: normalizeEnvironmentTier(item.tier),
      });
    }

    const { created, updated, environments } = await this.environmentRepository.upsertManyByName(
      params.projectId,
      sanitized,
    );

    return { created, updated, environments };
  }
}

export default UpsertEnvironments;
