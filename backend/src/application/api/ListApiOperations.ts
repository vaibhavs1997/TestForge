// ListApiOperations - Application Use Case
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';

export class ListApiOperations {
  constructor(private readonly apiOperationRepository: ApiOperationRepository) {}

  async execute(projectId: string, serviceId: string): Promise<ApiOperationEntity[]> {
    return this.apiOperationRepository.findByProjectAndService(projectId, serviceId);
  }
}

export default ListApiOperations;