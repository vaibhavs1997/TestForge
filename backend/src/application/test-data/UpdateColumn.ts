// UpdateColumn - Application Use Case
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class UpdateColumn {
  constructor(private readonly columnRepository: ColumnRepository) {}

  async execute(params: {
    id: string;
    name?: string;
    displayName?: string;
    dataType?: string;
    required?: boolean;
    unique?: boolean;
    nullable?: boolean;
    description?: string;
  }): Promise<any> {
    const existing = await this.columnRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Column with id ${params.id} not found`);
    }

    let dataType: string | undefined;

    if (params.name !== undefined) {
      ValidationHelpers.validateNotEmpty(params.name, 'Column name');
    }

    if (params.dataType !== undefined) {
      dataType = ValidationHelpers.validateRequired(params.dataType, 'Data type');
    }

    if (params.name && params.name.trim() !== existing.name) {
      try {
        await ValidationHelpers.validateUniqueNameInContext(
          this.columnRepository,
          params.name,
          existing.datasetId,
          'Column'
        );
      } catch (error) {
        if (error instanceof Error && error.message === `Column with name "${params.name}" already exists in this column`) {
          throw new Error(`Column with name "${params.name}" already exists in this dataset`);
        }
        throw error;
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = ValidationHelpers.trimString(params.name);
    if (params.displayName !== undefined) updateData.displayName = params.displayName.trim();
    if (dataType !== undefined) updateData.dataType = dataType;
    if (params.required !== undefined) updateData.required = params.required;
    if (params.unique !== undefined) updateData.unique = params.unique;
    if (params.nullable !== undefined) updateData.nullable = params.nullable;
    if (params.description !== undefined) updateData.description = ValidationHelpers.trimString(params.description);

    return this.columnRepository.update(params.id, updateData);
  }
}

export default UpdateColumn;
