// Versioning module types
export type EntityType = 
  | 'Requirement'
  | 'Knowledge'
  | 'Dataset'
  | 'Assertion'
  | 'TestSuite'
  | 'ExecutionProfile'
  | 'ExecutionPlan'
  | 'Report';

export interface Version {
  id: string;
  projectId: string;
  entityType: EntityType;
  entityId: string;
  versionNumber: number;
  snapshot: Record<string, any>;
  changeSummary: string | null;
  createdBy: string;
  createdAt: number;
}

export interface VersionComparison {
  oldVersion: Version;
  newVersion: Version;
  differences: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}