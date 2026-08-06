// DeleteApiService - Application Use Case
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { EventPublisher } from '../EventPublisher';

export class DeleteApiService {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(projectId: string, id: string): Promise<void> {
    const existing = await this.apiServiceRepository.findById(id);
    if (!existing || existing.projectId !== projectId) {
      throw new Error(`Service with id ${id} not found`);
    }

    await this.apiOperationRepository.deleteByServiceId(projectId, id);
    const removed = await this.apiServiceRepository.deleteInProject(projectId, id);
    if (!removed) {
      throw new Error(`Service with id ${id} not found`);
    }

    if (this.eventPublisher) {
      await this.eventPublisher.deleted('api', existing.id, existing.projectId, 'ApiService', existing as any);
    }
  }
}

export default DeleteApiService;
