// UpdateEnvironment - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository.js';
import { EnvironmentEntity, type EnvironmentExecutionPolicy, type EnvironmentTier, normalizeEnvironmentTier } from '../../domain/environment/EnvironmentEntity.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';
import { EventPublisher } from '../EventPublisher.js';
import type { SecretStore } from '../../domain/security/SecretStore.js';
import { persistEnvironmentSecrets } from './EnvironmentSecretPersistence.js';

export class UpdateEnvironment {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly secretStore?: SecretStore,
  ) {}

  async execute(params: {
    id: string;
    name?: string;
    baseUrl?: string;
    description?: string;
    authentication?: any;
    variables?: Record<string, string>;
    timeout?: number;
    isDefault?: boolean;
    tier?: EnvironmentTier;
    executionPolicy?: Partial<EnvironmentExecutionPolicy>;
  }): Promise<EnvironmentEntity> {
    const existing = await this.environmentRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Environment with id ${params.id} not found`);
    }

    if (params.name !== undefined) {
      ValidationHelpers.validateNotEmpty(params.name, 'Environment Name');
      await ValidationHelpers.validateUniqueName(
        this.environmentRepository,
        params.name,
        existing.projectId,
        existing.name
      );
    }

    if (params.baseUrl !== undefined) {
      ValidationHelpers.validateNotEmpty(params.baseUrl, 'Base URL');
    }

    if (params.timeout !== undefined) {
      ValidationHelpers.validateGreaterThan(params.timeout, 0, 'Timeout');
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.baseUrl !== undefined) updateData.baseUrl = params.baseUrl.trim();
    if (params.description !== undefined) updateData.description = ValidationHelpers.trimString(params.description);
    if (params.authentication !== undefined || params.variables !== undefined) {
      const persistedSecrets = this.secretStore
        ? await persistEnvironmentSecrets({ projectId: existing.projectId, environmentId: existing.id, authentication: params.authentication, variables: params.variables }, this.secretStore)
        : { authentication: params.authentication, variables: params.variables };
      if (params.authentication !== undefined) updateData.authentication = persistedSecrets.authentication;
      if (params.variables !== undefined) updateData.variables = persistedSecrets.variables;
    }
    if (params.timeout !== undefined) updateData.timeout = params.timeout;
    if (params.isDefault !== undefined) updateData.isDefault = params.isDefault;
    if (params.tier !== undefined) updateData.tier = normalizeEnvironmentTier(params.tier);
    if (params.executionPolicy !== undefined) updateData.executionPolicy = params.executionPolicy;

    // Keep one project-wide default environment. The API workspace uses this
    // flag as the shared environment selection for requirements and execution.
    if (params.isDefault === true) {
      const projectEnvironments = await this.environmentRepository.findByProject(existing.projectId);
      for (const environment of projectEnvironments) {
        if (environment.id !== existing.id && environment.isDefault) {
          await this.environmentRepository.update(environment.id, { isDefault: false });
        }
      }
    }

    const updated = await this.environmentRepository.update(params.id, updateData);

    if (this.eventPublisher) {
      await this.eventPublisher.updated(
        'environment',
        updated.id,
        updated.projectId,
        'Environment',
        existing as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>,
      );
    }

    return updated;
  }
}

export default UpdateEnvironment;
