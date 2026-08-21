// UpdateRow - Application Use Case for updating a Dataset Row
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export class UpdateRow {
  constructor(private readonly datasetRowRepository: DatasetRowRepository) {}

  async execute(input: {
    id: string;
    values?: Record<string, any>;
  }): Promise<any> {
    const id = ValidationHelpers.validateRequired(input.id, 'Row id');

    const existing = await this.datasetRowRepository.findById(id);
    if (!existing) {
      throw new Error(`Dataset Row with id ${id} not found`);
    }

    const updateData: any = {};
    if (input.values !== undefined) {
      updateData.values = input.values;
    }

    return this.datasetRowRepository.update(id, updateData);
  }
}

export default UpdateRow;
