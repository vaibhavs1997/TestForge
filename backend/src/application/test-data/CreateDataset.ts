// CreateDataset - Application Use Case
import { randomUUID } from 'node:crypto';
import { DatasetRepository } from '../../domain/test-data/DatasetRepository.js';
import { DatasetEntity } from '../../domain/test-data/DatasetEntity.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export class CreateDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(params: {
    projectId: string;
    name: string;
    description?: string;
    category?: string;
  }): Promise<DatasetEntity> {
    const name = ValidationHelpers.validateRequired(params.name, 'Dataset Name');

    await ValidationHelpers.validateUniqueName(
      this.datasetRepository,
      name,
      params.projectId
    );

    const now = Date.now();
    const dataset = new DatasetEntity(
      randomUUID(),
      params.projectId,
      name,
      ValidationHelpers.trimString(params.description),
      ValidationHelpers.trimString(params.category) || 'Custom',
      0,
      now,
      now
    );

    return this.datasetRepository.create(dataset);
  }
}

export default CreateDataset;