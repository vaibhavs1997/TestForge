// CreateEnvironment - Application Use Case
import { randomUUID } from 'node:crypto';
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';
import { DEFAULT_TIMEOUT_MS } from '../../constants/defaults';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';
import { EventPublisher } from '../EventPublisher';

export class CreateEnvironment {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(params: {
    projectId: string;
    name: string;
    baseUrl: string;
    description?: string;
    authentication?: any;
    variables?: Record<string, string>;
    timeout?: number;
  }): Promise<EnvironmentEntity> {
    const name = ValidationHelpers.validateRequired(params.name, 'Environment Name');
    const baseUrl = ValidationHelpers.validateRequired(params.baseUrl, 'Base URL');

    await ValidationHelpers.validateUniqueName(
      this.environmentRepository,
      name,
      params.projectId
    );

    const now = Date.now();
    const environment = new EnvironmentEntity(
      randomUUID(),
      params.projectId,
      name,
      baseUrl,
      ValidationHelpers.trimString(params.description),
      params.authentication || null,
      params.variables || {},
      params.timeout || DEFAULT_TIMEOUT_MS,
      now,
      now
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