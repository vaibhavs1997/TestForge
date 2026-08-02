// PopulationProfileEntity - Domain Entity for Dataset Population Profile

export class PopulationProfileEntity {
  constructor(
    public readonly id: string,
    public readonly datasetId: string,
    public columnId: string,
    public strategyType: string,
    public configuration: Record<string, any>,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default PopulationProfileEntity;