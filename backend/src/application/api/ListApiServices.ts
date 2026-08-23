// ListApiServices - Application Use Case
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity.js';

export class ListApiServices {
  constructor(private readonly apiServiceRepository: ApiServiceRepository) {}

  async execute(projectId?: string): Promise<ApiServiceEntity[]> {
    if (projectId) {
      return this.apiServiceRepository.findByProject(projectId);
    }
    return this.apiServiceRepository.list();
  }
}

export default ListApiServices;