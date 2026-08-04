// UpdateApiService - Application Use Case
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
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
  }): Promise<ApiServiceEntity> {
    const existing = await this.apiServiceRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Service with id ${params.id} not found`);
    }

    if (params.name !== undefined && !params.name.trim()) {
      throw new Error('Service Name cannot be empty');
    }

    if (params.name && params.name.trim() !== existing.name) {
      const exists = await this.apiServiceRepository.existsByName(params.name.trim(), existing.projectId);
      if (exists) {
        throw new Error(`Service with name "${params.name}" already exists in this project`);
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.version !== undefined) updateData.version = params.version.trim() || 'v1';
    if (params.tags !== undefined) updateData.tags = params.tags.map(t => t.trim()).filter(t => t.length > 0);

    const updated = await this.apiServiceRepository.update(params.id, updateData);

    // Publish through central EventPublisher — triggers audit, versioning,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.updated('api', updated.id, updated.projectId, 'ApiService', existing as any, updated as any);
    }

    return updated;
  }
}

export default UpdateApiService;