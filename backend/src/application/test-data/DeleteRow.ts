// DeleteRow - Application Use Case for deleting a Dataset Row
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';

export class DeleteRow {
  constructor(private readonly datasetRowRepository: DatasetRowRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.datasetRowRepository.findById(id);
    if (!existing) {
      throw new Error(`Dataset Row with id ${id} not found`);
    }
    await this.datasetRowRepository.delete(id);
  }
}

export default DeleteRow;