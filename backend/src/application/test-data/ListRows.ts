// ListRows - Application Use Case for listing Dataset Rows
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository.js';

export class ListRows {
  constructor(private readonly datasetRowRepository: DatasetRowRepository) {}

  async execute(datasetId: string): Promise<any[]> {
    if (!datasetId) {
      throw new Error('datasetId is required');
    }
    return this.datasetRowRepository.list(datasetId);
  }
}

export default ListRows;