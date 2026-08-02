// UpdateDataset - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';

export class UpdateDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(params: {
    id: string;
    name?: string;
    description?: string;
    category?: string;
  }): Promise<any> {
    const existing = await this.datasetRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Dataset with id ${params.id} not found`);
    }

    if (params.name !== undefined && !params.name.trim()) {
      throw new Error('Dataset Name cannot be empty');
    }

    if (params.name && params.name.trim() !== existing.name) {
      const exists = await this.datasetRepository.existsByName(params.name.trim(), existing.projectId);
      if (exists) {
        throw new Error(`Dataset with name "${params.name}" already exists in this project`);
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.category !== undefined) updateData.category = params.category.trim() || 'Custom';

    return this.datasetRepository.update(params.id, updateData);
  }
}

export default UpdateDataset;