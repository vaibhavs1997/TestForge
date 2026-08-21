// DeleteColumn - Application Use Case
import { ColumnRepository } from '../../domain/test-data/ColumnRepository.js';

export class DeleteColumn {
  constructor(private readonly columnRepository: ColumnRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.columnRepository.findById(id);
    if (!existing) {
      throw new Error(`Column with id ${id} not found`);
    }
    await this.columnRepository.delete(id);
  }
}

export default DeleteColumn;