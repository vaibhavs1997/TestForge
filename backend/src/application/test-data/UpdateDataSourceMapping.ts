// UpdateDataSourceMapping - Application Use Case
import { DataSourceMappingRepository } from '../../domain/test-data/DataSourceMappingRepository';

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

    if (params.fieldPath !== undefined && !params.fieldPath.trim()) {
      throw new Error('Field path cannot be empty');
    }

    if (params.sourceType !== undefined && !params.sourceType.trim()) {
      throw new Error('Source type is required');
    }

    const updateData: any = {};
    if (params.fieldPath !== undefined) updateData.fieldPath = params.fieldPath.trim();
    if (params.sourceType !== undefined) updateData.sourceType = params.sourceType.trim();
    if (params.datasetId !== undefined) updateData.datasetId = params.datasetId;
    if (params.datasetColumn !== undefined) updateData.datasetColumn = params.datasetColumn?.trim();
    if (params.environmentVariable !== undefined) updateData.environmentVariable = params.environmentVariable?.trim();
    if (params.runtimeOperationId !== undefined) updateData.runtimeOperationId = params.runtimeOperationId;
    if (params.runtimeField !== undefined) updateData.runtimeField = params.runtimeField?.trim();
    if (params.notes !== undefined) updateData.notes = params.notes.trim();

    return this.mappingRepository.update(params.id, updateData);
  }
}

export default UpdateDataSourceMapping;