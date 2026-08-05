// GetApiOperation - Application Use Case
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';

export class GetApiOperation {
  constructor(private readonly apiOperationRepository: ApiOperationRepository) {}

  async execute(id: string): Promise<ApiOperationEntity> {
    const operation = await this.apiOperationRepository.findById(id);
    if (!operation) {
      throw new Error(`Operation with id ${id} not found`);
    }
    return operation;
  }
}

export default GetApiOperation;