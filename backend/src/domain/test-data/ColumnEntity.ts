// ColumnEntity - Domain Entity for Dataset Column

export class ColumnEntity {
  constructor(
    public readonly id: string,
    public readonly datasetId: string,
    public name: string,
    public displayName: string,
    public dataType: string,
    public required: boolean,
    public unique: boolean,
    public nullable: boolean,
    public description: string,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default ColumnEntity;