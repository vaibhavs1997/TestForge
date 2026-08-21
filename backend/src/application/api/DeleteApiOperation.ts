// DeleteApiOperation - Application Use Case
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';

export class DeleteApiOperation {
  constructor(private readonly apiOperationRepository: ApiOperationRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.apiOperationRepository.findById(id);
    if (!existing) {
      throw new Error(`Operation with id ${id} not found`);
    }
    await this.apiOperationRepository.delete(id);
  }
}

export default DeleteApiOperation;