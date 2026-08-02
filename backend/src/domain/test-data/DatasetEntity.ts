// DatasetEntity - Domain Entity for Dataset

export class DatasetEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public description: string,
    public category: string,
    public rowCount: number,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default DatasetEntity;