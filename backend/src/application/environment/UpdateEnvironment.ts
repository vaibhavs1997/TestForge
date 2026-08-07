// UpdateEnvironment - Application Use Case
import { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';
import { EventPublisher } from '../EventPublisher';

export class UpdateEnvironment {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly eventPublisher?: EventPublisher,
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
    if (params.authentication !== undefined) updateData.authentication = params.authentication;
    if (params.variables !== undefined) updateData.variables = params.variables;
    if (params.timeout !== undefined) updateData.timeout = params.timeout;
    if (params.isDefault !== undefined) updateData.isDefault = params.isDefault;

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