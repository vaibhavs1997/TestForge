// DatasetRowEntity - Domain Entity for Dataset Row

export class DatasetRowEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly datasetId: string,
    public values: Record<string, any>,
    public readonly createdAt: number,
    public updatedAt: number,
    public reservedBy?: string,
    public reservedAt?: number
  ) {}
}

export default DatasetRowEntity;
