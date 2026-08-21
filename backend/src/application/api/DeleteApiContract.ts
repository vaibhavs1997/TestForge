// DeleteApiContract - Application Use Case
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import { EventPublisher } from '../EventPublisher.js';

export class DeleteApiContract {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(projectId: string): Promise<{ servicesDeleted: number; operationsDeleted: number }> {
    const servicesDeleted = await this.apiServiceRepository.deleteByProject(projectId);
    const operationsDeleted = await this.apiOperationRepository.deleteByProject(projectId);

    if (this.eventPublisher) {
      await this.eventPublisher.deleted(
        'api',
        `api-contract:${projectId}`,
        projectId,
        'ApiContract',
        {
          servicesDeleted,
          operationsDeleted,
        } as any,
      );
    }

    return { servicesDeleted, operationsDeleted };
  }
}

export default DeleteApiContract;
