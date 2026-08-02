// UpdateColumn - Application Use Case
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';

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

    if (params.name !== undefined && !params.name.trim()) {
      throw new Error('Column name cannot be empty');
    }

    if (params.dataType !== undefined && !params.dataType.trim()) {
      throw new Error('Data type is required');
    }

    if (params.name && params.name.trim() !== existing.name) {
      const exists = await this.columnRepository.existsByName(params.name.trim(), existing.datasetId);
      if (exists) {
        throw new Error(`Column with name "${params.name}" already exists in this dataset`);
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.displayName !== undefined) updateData.displayName = params.displayName.trim();
    if (params.dataType !== undefined) updateData.dataType = params.dataType.trim();
    if (params.required !== undefined) updateData.required = params.required;
    if (params.unique !== undefined) updateData.unique = params.unique;
    if (params.nullable !== undefined) updateData.nullable = params.nullable;
    if (params.description !== undefined) updateData.description = params.description.trim();

    return this.columnRepository.update(params.id, updateData);
  }
}

export default UpdateColumn;