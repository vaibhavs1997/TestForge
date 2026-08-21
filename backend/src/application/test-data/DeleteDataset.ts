// DeleteDataset - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository.js';

export class DeleteDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(params: { projectId: string; id: string }): Promise<void> {
    const existing = await this.datasetRepository.findById(params.id);
    if (!existing || existing.projectId !== params.projectId) {
      throw new Error(`Dataset with id ${params.id} not found`);
    }
    await this.datasetRepository.delete(params.id);
  }
}

export default DeleteDataset;