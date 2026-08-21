// CreateColumn - Application Use Case
import { randomUUID } from 'node:crypto';
import { ColumnRepository } from '../../domain/test-data/ColumnRepository.js';
import { ColumnEntity } from '../../domain/test-data/ColumnEntity.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

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
    const name = ValidationHelpers.validateRequired(params.name, 'Column name');
    const dataType = ValidationHelpers.validateRequired(params.dataType, 'Data type');

    try {
      await ValidationHelpers.validateUniqueNameInContext(
        this.columnRepository,
        params.name,
        params.datasetId,
        'Column'
      );
    } catch (error) {
      if (error instanceof Error && error.message === `Column with name "${params.name}" already exists in this column`) {
        throw new Error(`Column with name "${params.name}" already exists in this dataset`);
      }
      throw error;
    }

    const now = Date.now();
    const column = new ColumnEntity(
      randomUUID(),
      params.datasetId,
      name,
      params.displayName.trim(),
      dataType,
      params.required,
      params.unique,
      params.nullable,
      ValidationHelpers.trimString(params.description),
      now,
      now
    );

    return this.columnRepository.create(column);
  }
}

export default CreateColumn;
