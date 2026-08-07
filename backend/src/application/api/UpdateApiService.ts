// UpdateApiService - Application Use Case
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';
import { EventPublisher } from '../EventPublisher';

export class UpdateApiService {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(params: {
    id: string;
    name?: string;
    description?: string;
    version?: string;
    tags?: string[];
    baseUrl?: string;
  }): Promise<ApiServiceEntity> {
    const existing = await this.apiServiceRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Service with id ${params.id} not found`);
    }

    if (params.name !== undefined) {
      ValidationHelpers.validateNotEmpty(params.name, 'Service Name');
    }

    if (params.name && params.name.trim() !== existing.name) {
      try {
        await ValidationHelpers.validateUniqueName(
          this.apiServiceRepository,
          params.name,
          existing.projectId,
          existing.name
        );
      } catch (error) {
        if (error instanceof Error && error.message === `Resource with name "${params.name}" already exists in this project`) {
          throw new Error(`Service with name "${params.name}" already exists in this project`);
        }
        throw error;
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = ValidationHelpers.trimString(params.name);
    if (params.description !== undefined) updateData.description = ValidationHelpers.trimString(params.description);
    if (params.version !== undefined) updateData.version = ValidationHelpers.trimString(params.version) || 'v1';
    if (params.tags !== undefined) updateData.tags = ValidationHelpers.trimStringArray(params.tags);
    if (params.baseUrl !== undefined) updateData.baseUrl = ValidationHelpers.trimString(params.baseUrl);

    const updated = await this.apiServiceRepository.update(params.id, updateData);

    if (this.eventPublisher) {
      await this.eventPublisher.updated('api', updated.id, updated.projectId, 'ApiService', existing as any, updated as any);
    }

    return updated;
  }
}

export default UpdateApiService;
