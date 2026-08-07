// GetDataset - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';

export class GetDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(params: { projectId: string; id: string }): Promise<any> {
    const dataset = await this.datasetRepository.findById(params.id);
    if (!dataset || dataset.projectId !== params.projectId) {
      throw new Error(`Dataset with id ${params.id} not found`);
    }
    return dataset;
  }
}

export default GetDataset;