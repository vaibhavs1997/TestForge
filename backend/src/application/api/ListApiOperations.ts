// ListApiOperations - Application Use Case
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';

export class ListApiOperations {
  constructor(private readonly apiOperationRepository: ApiOperationRepository) {}

  async execute(serviceId?: string): Promise<ApiOperationEntity[]> {
    if (serviceId) {
      return this.apiOperationRepository.findByService(serviceId);
    }
    return this.apiOperationRepository.list();
  }
}

export default ListApiOperations;