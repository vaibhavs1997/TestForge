// VersionEntity - Domain Entity for Versioning Framework
// Maintains immutable version history for important entities.

export type EntityType =
  | 'Requirement'
  | 'TestStrategy'
  | 'TestDesign'
  | 'ExecutionPlan'
  | 'ExecutionProfile'
  | 'Assertion'
  | 'TestSuite'
  | 'Environment'
  | 'Dataset'
  | 'Column'
  | 'Row'
  | 'DataSourceMapping'
  | 'PopulationProfile'
  | 'Knowledge'
  | 'Analysis'
  | 'Report'
  | 'Schedule'
  | 'Plugin'
  | 'Provider'
  | 'AIProvider'
  | 'Pipeline';

export class VersionEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly entityType: EntityType,
    public readonly entityId: string,
    public readonly versionNumber: number,
    public readonly snapshot: Record<string, any>,
    public readonly changeSummary: string | null,
    public readonly createdBy: string,
    public readonly createdAt: number
  ) {}
}

export default VersionEntity;
