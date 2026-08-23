// CreateEnvironment - Application Use Case
import { randomUUID } from 'node:crypto';
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository.js';
import { EnvironmentEntity, type EnvironmentExecutionPolicy, type EnvironmentTier, normalizeEnvironmentTier } from '../../domain/environment/EnvironmentEntity.js';
import { DEFAULT_TIMEOUT_MS } from '../../constants/defaults.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';
import { EventPublisher } from '../EventPublisher.js';
import type { SecretStore } from '../../domain/security/SecretStore.js';
import { persistEnvironmentSecrets } from './EnvironmentSecretPersistence.js';

export class CreateEnvironment {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly secretStore?: SecretStore,
  ) {}

  async execute(params: {
    projectId: string;
    name: string;
    baseUrl: string;
    description?: string;
    authentication?: any;
    variables?: Record<string, string>;
    timeout?: number;
    tier?: EnvironmentTier;
    executionPolicy?: Partial<EnvironmentExecutionPolicy>;
  }): Promise<EnvironmentEntity> {
    const name = ValidationHelpers.validateRequired(params.name, 'Environment Name');
    const baseUrl = ValidationHelpers.validateRequired(params.baseUrl, 'Base URL');

    await ValidationHelpers.validateUniqueName(
      this.environmentRepository,
      name,
      params.projectId
    );

    const now = Date.now();
    const id = randomUUID();
    const persistedSecrets = this.secretStore
      ? await persistEnvironmentSecrets({ projectId: params.projectId, environmentId: id, authentication: params.authentication, variables: params.variables }, this.secretStore)
      : { authentication: params.authentication, variables: params.variables };
    const environment = new EnvironmentEntity(
      id,
      params.projectId,
      name,
      baseUrl,
      ValidationHelpers.trimString(params.description),
      persistedSecrets.authentication || null,
      persistedSecrets.variables || {},
      params.timeout || DEFAULT_TIMEOUT_MS,
      now,
      now,
      undefined,
      normalizeEnvironmentTier(params.tier),
      params.executionPolicy || null,
    );

    const created = await this.environmentRepository.create(environment);

    if (this.eventPublisher) {
      await this.eventPublisher.created(
        'environment',
        created.id,
        created.projectId,
        'Environment',
        created as unknown as Record<string, unknown>,
      );
    }

    return created;
  }
}

export default CreateEnvironment;
