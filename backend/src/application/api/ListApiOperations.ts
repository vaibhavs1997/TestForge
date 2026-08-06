// ListApiOperations - Application Use Case
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';

export class ListApiOperations {
  constructor(private readonly apiOperationRepository: ApiOperationRepository) {}

  async execute(projectId: string, serviceId: string): Promise<ApiOperationEntity[]> {
    return this.apiOperationRepository.findByProjectAndService(projectId, serviceId);
  }
}

export default ListApiOperations;