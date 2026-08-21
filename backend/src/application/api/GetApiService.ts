// GetApiService - Application Use Case
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity.js';

export class GetApiService {
  constructor(private readonly apiServiceRepository: ApiServiceRepository) {}

  async execute(id: string): Promise<ApiServiceEntity> {
    const service = await this.apiServiceRepository.findById(id);
    if (!service) {
      throw new Error(`Service with id ${id} not found`);
    }
    return service;
  }
}

export default GetApiService;