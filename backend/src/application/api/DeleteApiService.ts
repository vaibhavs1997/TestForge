// DeleteApiService - Application Use Case
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { EventPublisher } from '../EventPublisher';

export class DeleteApiService {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.apiServiceRepository.findById(id);
    if (!existing) {
      throw new Error(`Service with id ${id} not found`);
    }
    await this.apiServiceRepository.delete(id);

    // Publish through central EventPublisher — triggers audit, versioning,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.deleted('api', existing.id, existing.projectId, 'ApiService', existing as any);
    }
  }
}

export default DeleteApiService;