// AuditLogEntity - Domain Entity for Audit Log Framework
// Captures every important action performed in the system.

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXECUTE'
  | 'GENERATE'
  | 'APPROVE'
  | 'REJECT'
  | 'RESTORE'
  | 'ENABLE'
  | 'DISABLE';

export type AuditModule = 
  | 'Project'
  | 'API'
  | 'Environment'
  | 'Dataset'
  | 'Knowledge'
  | 'Requirement'
  | 'Assertion'
  | 'ExecutionPlan'
  | 'ExecutionProfile'
  | 'TestSuite'
  | 'Scheduler'
  | 'Execution'
  | 'Report'
  | 'Notification'
  | 'Provider'
  | 'Version'
  | 'Analysis'
  | 'Plugin'
  | 'AI'
  | 'AuditLog';

export interface AuditMetadata {
  [key: string]: any;
}

export class AuditLogEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly module: AuditModule,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly action: AuditAction,
    public readonly performedBy: string,
    public readonly timestamp: number,
    public readonly oldValue: Record<string, any> | null,
    public readonly newValue: Record<string, any> | null,
    public readonly metadata: AuditMetadata
  ) {}
}

export default AuditLogEntity;