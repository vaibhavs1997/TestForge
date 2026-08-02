// ListDatasets - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';

export class ListDatasets {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(params: {
    projectId?: string;
  }): Promise<any[]> {
    if (params.projectId) {
      return this.datasetRepository.findByProject(params.projectId);
    }
    return this.datasetRepository.list();
  }
}

export default ListDatasets;