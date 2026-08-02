// GetDataset - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';

export class GetDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(id: string): Promise<any> {
    const dataset = await this.datasetRepository.findById(id);
    if (!dataset) {
      throw new Error(`Dataset with id ${id} not found`);
    }
    return dataset;
  }
}

export default GetDataset;