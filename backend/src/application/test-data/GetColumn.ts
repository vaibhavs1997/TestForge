// GetColumn - Application Use Case
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';

export class GetColumn {
  constructor(private readonly columnRepository: ColumnRepository) {}

  async execute(id: string): Promise<any> {
    const column = await this.columnRepository.findById(id);
    if (!column) {
      throw new Error(`Column with id ${id} not found`);
    }
    return column;
  }
}

export default GetColumn;