// GetRow - Application Use Case for retrieving a Dataset Row
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository.js';

export class GetRow {
  constructor(private readonly datasetRowRepository: DatasetRowRepository) {}

  async execute(id: string): Promise<any> {
    const row = await this.datasetRowRepository.findById(id);
    if (!row) {
      throw new Error(`Dataset Row with id ${id} not found`);
    }
    return row;
  }
}

export default GetRow;