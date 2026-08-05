// ListColumns - Application Use Case
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';

export class ListColumns {
  constructor(private readonly columnRepository: ColumnRepository) {}

  async execute(params: {
    datasetId?: string;
  }): Promise<any[]> {
    if (params.datasetId) {
      return this.columnRepository.findByDataset(params.datasetId);
    }
    return this.columnRepository.list();
  }
}

export default ListColumns;