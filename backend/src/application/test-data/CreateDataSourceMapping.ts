// CreateDataSourceMapping - Application Use Case
import { randomUUID } from 'node:crypto';
import { DataSourceMappingRepository } from '../../domain/test-data/DataSourceMappingRepository.js';
import { DataSourceMappingEntity } from '../../domain/test-data/DataSourceMappingEntity.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export class CreateDataSourceMapping {
  constructor(private readonly mappingRepository: DataSourceMappingRepository) {}

  async execute(params: {
    projectId: string;
    serviceId: string;
    operationId: string;
    fieldPath: string;
    sourceType: string;
    datasetId?: string;
    datasetColumn?: string;
    environmentVariable?: string;
    runtimeOperationId?: string;
    runtimeField?: string;
    notes?: string;
  }): Promise<DataSourceMappingEntity> {
    const fieldPath = ValidationHelpers.validateRequired(params.fieldPath, 'Field path');
    const sourceType = ValidationHelpers.validateRequired(params.sourceType, 'Source type');

    const exists = await this.mappingRepository.existsByField(params.operationId, fieldPath);
    if (exists) {
      throw new Error(`Mapping for field "${params.fieldPath}" already exists for this operation`);
    }

    const now = Date.now();
    const mapping = new DataSourceMappingEntity(
      randomUUID(),
      params.projectId,
      params.serviceId,
      params.operationId,
      fieldPath,
      sourceType,
      ValidationHelpers.trimString(params.notes),
      now,
      now,
      params.datasetId,
      params.datasetColumn === undefined ? undefined : ValidationHelpers.trimString(params.datasetColumn),
      params.environmentVariable === undefined ? undefined : ValidationHelpers.trimString(params.environmentVariable),
      params.runtimeOperationId,
      params.runtimeField === undefined ? undefined : ValidationHelpers.trimString(params.runtimeField)
    );

    return this.mappingRepository.create(mapping);
  }
}

export default CreateDataSourceMapping;
