// CreateApiService - Application Use Case
import { randomUUID } from 'node:crypto';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { EventPublisher } from '../EventPublisher';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

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
    baseUrl?: string;
  }): Promise<ApiServiceEntity> {
    const name = ValidationHelpers.validateRequired(params.name, 'Service Name');

    await ValidationHelpers.validateUniqueName(
      this.apiServiceRepository,
      name,
      params.projectId
    );

    const now = Date.now();
    const service = new ApiServiceEntity(
      randomUUID(),
      params.projectId,
      name,
      ValidationHelpers.trimString(params.description),
      ValidationHelpers.trimString(params.version) || 'v1',
      ValidationHelpers.trimStringArray(params.tags),
      ValidationHelpers.trimString(params.baseUrl),
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