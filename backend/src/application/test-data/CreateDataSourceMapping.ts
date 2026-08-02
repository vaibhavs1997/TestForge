// CreateDataSourceMapping - Application Use Case
import { DataSourceMappingRepository } from '../../domain/test-data/DataSourceMappingRepository';
import { DataSourceMappingEntity } from '../../domain/test-data/DataSourceMappingEntity';

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
    if (!params.fieldPath || !params.fieldPath.trim()) {
      throw new Error('Field path is required');
    }

    if (!params.sourceType || !params.sourceType.trim()) {
      throw new Error('Source type is required');
    }

    const exists = await this.mappingRepository.existsByField(params.operationId, params.fieldPath.trim());
    if (exists) {
      throw new Error(`Mapping for field "${params.fieldPath}" already exists for this operation`);
    }

    const now = Date.now();
    const mapping = new DataSourceMappingEntity(
      crypto.randomUUID(),
      params.projectId,
      params.serviceId,
      params.operationId,
      params.fieldPath.trim(),
      params.sourceType.trim(),
      params.notes?.trim() || '',
      now,
      now,
      params.datasetId,
      params.datasetColumn?.trim(),
      params.environmentVariable?.trim(),
      params.runtimeOperationId,
      params.runtimeField?.trim()
    );

    return this.mappingRepository.create(mapping);
  }
}

export default CreateDataSourceMapping;