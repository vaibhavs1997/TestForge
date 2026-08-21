// UpdateDataSourceMapping - Application Use Case
import { DataSourceMappingRepository } from '../../domain/test-data/DataSourceMappingRepository.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export class UpdateDataSourceMapping {
  constructor(private readonly mappingRepository: DataSourceMappingRepository) {}

  async execute(params: {
    id: string;
    fieldPath?: string;
    sourceType?: string;
    datasetId?: string;
    datasetColumn?: string;
    environmentVariable?: string;
    runtimeOperationId?: string;
    runtimeField?: string;
    notes?: string;
  }): Promise<any> {
    const existing = await this.mappingRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Mapping with id ${params.id} not found`);
    }

    let sourceType: string | undefined;

    if (params.fieldPath !== undefined) {
      ValidationHelpers.validateNotEmpty(params.fieldPath, 'Field path');
    }

    if (params.sourceType !== undefined) {
      sourceType = ValidationHelpers.validateRequired(params.sourceType, 'Source type');
    }

    const updateData: any = {};
    if (params.fieldPath !== undefined) updateData.fieldPath = ValidationHelpers.trimString(params.fieldPath);
    if (sourceType !== undefined) updateData.sourceType = sourceType;
    if (params.datasetId !== undefined) updateData.datasetId = params.datasetId;
    if (params.datasetColumn !== undefined) updateData.datasetColumn = ValidationHelpers.trimString(params.datasetColumn);
    if (params.environmentVariable !== undefined) updateData.environmentVariable = ValidationHelpers.trimString(params.environmentVariable);
    if (params.runtimeOperationId !== undefined) updateData.runtimeOperationId = params.runtimeOperationId;
    if (params.runtimeField !== undefined) updateData.runtimeField = ValidationHelpers.trimString(params.runtimeField);
    if (params.notes !== undefined) updateData.notes = ValidationHelpers.trimString(params.notes);

    return this.mappingRepository.update(params.id, updateData);
  }
}

export default UpdateDataSourceMapping;
