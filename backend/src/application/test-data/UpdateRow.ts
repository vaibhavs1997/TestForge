// UpdateRow - Application Use Case for updating a Dataset Row
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';

export class UpdateRow {
  constructor(private readonly datasetRowRepository: DatasetRowRepository) {}

  async execute(input: {
    id: string;
    values?: Record<string, any>;
  }): Promise<any> {
    if (!input.id) {
      throw new Error('Row id is required');
    }

    const existing = await this.datasetRowRepository.findById(input.id);
    if (!existing) {
      throw new Error(`Dataset Row with id ${input.id} not found`);
    }

    const updateData: any = {};
    if (input.values !== undefined) {
      updateData.values = input.values;
    }

    return this.datasetRowRepository.update(input.id, updateData);
  }
}

export default UpdateRow;