// DeleteApiService - Application Use Case
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';

export class DeleteApiService {
  constructor(private readonly apiServiceRepository: ApiServiceRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.apiServiceRepository.findById(id);
    if (!existing) {
      throw new Error(`Service with id ${id} not found`);
    }
    await this.apiServiceRepository.delete(id);
  }
}

export default DeleteApiService;