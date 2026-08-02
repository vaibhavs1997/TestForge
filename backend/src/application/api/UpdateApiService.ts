// UpdateApiService - Application Use Case
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';

export class UpdateApiService {
  constructor(private readonly apiServiceRepository: ApiServiceRepository) {}

  async execute(params: {
    id: string;
    name?: string;
    description?: string;
    version?: string;
    tags?: string[];
  }): Promise<ApiServiceEntity> {
    const existing = await this.apiServiceRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Service with id ${params.id} not found`);
    }

    if (params.name !== undefined && !params.name.trim()) {
      throw new Error('Service Name cannot be empty');
    }

    if (params.name && params.name.trim() !== existing.name) {
      const exists = await this.apiServiceRepository.existsByName(params.name.trim(), existing.projectId);
      if (exists) {
        throw new Error(`Service with name "${params.name}" already exists in this project`);
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.version !== undefined) updateData.version = params.version.trim() || 'v1';
    if (params.tags !== undefined) updateData.tags = params.tags.map(t => t.trim()).filter(t => t.length > 0);

    return this.apiServiceRepository.update(params.id, updateData);
  }
}

export default UpdateApiService;