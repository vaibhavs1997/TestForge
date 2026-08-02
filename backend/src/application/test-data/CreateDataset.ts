// CreateDataset - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';
import { DatasetEntity } from '../../domain/test-data/DatasetEntity';

export class CreateDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(params: {
    projectId: string;
    name: string;
    description?: string;
    category?: string;
  }): Promise<DatasetEntity> {
    if (!params.name || !params.name.trim()) {
      throw new Error('Dataset Name is required');
    }

    const trimmedName = params.name.trim();
    const exists = await this.datasetRepository.existsByName(trimmedName, params.projectId);
    if (exists) {
      throw new Error(`Dataset with name "${params.name}" already exists in this project`);
    }

    const now = Date.now();
    const dataset = new DatasetEntity(
      crypto.randomUUID(),
      params.projectId,
      trimmedName,
      params.description?.trim() || '',
      params.category?.trim() || 'Custom',
      0,
      now,
      now
    );

    return this.datasetRepository.create(dataset);
  }
}

export default CreateDataset;