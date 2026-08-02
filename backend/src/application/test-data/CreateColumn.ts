// CreateColumn - Application Use Case
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';
import { ColumnEntity } from '../../domain/test-data/ColumnEntity';

export class CreateColumn {
  constructor(private readonly columnRepository: ColumnRepository) {}

  async execute(params: {
    datasetId: string;
    name: string;
    displayName: string;
    dataType: string;
    required: boolean;
    unique: boolean;
    nullable: boolean;
    description?: string;
  }): Promise<ColumnEntity> {
    if (!params.name || !params.name.trim()) {
      throw new Error('Column name is required');
    }

    if (!params.dataType || !params.dataType.trim()) {
      throw new Error('Data type is required');
    }

    const exists = await this.columnRepository.existsByName(params.name.trim(), params.datasetId);
    if (exists) {
      throw new Error(`Column with name "${params.name}" already exists in this dataset`);
    }

    const now = Date.now();
    const column = new ColumnEntity(
      crypto.randomUUID(),
      params.datasetId,
      params.name.trim(),
      params.displayName.trim(),
      params.dataType.trim(),
      params.required,
      params.unique,
      params.nullable,
      params.description?.trim() || '',
      now,
      now
    );

    return this.columnRepository.create(column);
  }
}

export default CreateColumn;