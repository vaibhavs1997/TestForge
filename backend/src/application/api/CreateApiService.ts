// CreateApiService - Application Use Case
import { randomUUID } from 'node:crypto';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { EventPublisher } from '../EventPublisher';

export class CreateApiService {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(params: {
    projectId: string;
    name: string;
    description?: string;
    version?: string;
    tags?: string[];
  }): Promise<ApiServiceEntity> {
    if (!params.name || !params.name.trim()) {
      throw new Error('Service Name is required');
    }

    const exists = await this.apiServiceRepository.existsByName(params.name.trim(), params.projectId);
    if (exists) {
      throw new Error(`Service with name "${params.name}" already exists in this project`);
    }

    const now = Date.now();
    const service = new ApiServiceEntity(
      randomUUID(),
      params.projectId,
      params.name.trim(),
      params.description?.trim() || '',
      params.version?.trim() || 'v1',
      params.tags?.map(t => t.trim()).filter(t => t.length > 0) || [],
      now,
      now
    );

    const created = await this.apiServiceRepository.create(service);

    // Publish through central EventPublisher — triggers audit, versioning,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.created('api', created.id, created.projectId, 'ApiService', created as any);
    }

    return created;
  }
}

export default CreateApiService;