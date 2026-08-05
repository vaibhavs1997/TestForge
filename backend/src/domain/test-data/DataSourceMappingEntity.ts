// DataSourceMappingEntity - Domain Entity for Data Source Mapping

export class DataSourceMappingEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly serviceId: string,
    public readonly operationId: string,
    public fieldPath: string,
    public sourceType: string,
    public notes: string,
    public readonly createdAt: number,
    public updatedAt: number,
    public datasetId?: string,
    public datasetColumn?: string,
    public environmentVariable?: string,
    public runtimeOperationId?: string,
    public runtimeField?: string
  ) {}
}

export default DataSourceMappingEntity;