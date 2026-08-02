// DeleteDataset - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';

export class DeleteDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.datasetRepository.findById(id);
    if (!existing) {
      throw new Error(`Dataset with id ${id} not found`);
    }
    await this.datasetRepository.delete(id);
  }
}

export default DeleteDataset;