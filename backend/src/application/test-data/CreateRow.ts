// CreateRow - Application Use Case for creating a Dataset Row
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository.js';
import { DatasetRowEntity } from '../../domain/test-data/DatasetRowEntity.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export class CreateRow {
  constructor(private readonly datasetRowRepository: DatasetRowRepository) {}

  async execute(input: {
    projectId: string;
    datasetId: string;
    values: Record<string, any>;
  }): Promise<DatasetRowEntity> {
    ValidationHelpers.validateRequiredField(input.values, 'Row values');
    if (Object.keys(input.values).length === 0) {
      throw new Error('Row values are required');
    }

    const row = {
      projectId: input.projectId,
      datasetId: input.datasetId,
      values: input.values,
    };

    return this.datasetRowRepository.create(row);
  }
}

export default CreateRow;
