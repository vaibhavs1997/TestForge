// Audit Log module types
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
  | 'DISABLE'
  | 'ARCHIVE'
  | 'OPEN';

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
  | 'Analysis';

export interface AuditLog {
  id: string;
  projectId: string;
  module: AuditModule;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  timestamp: number;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  metadata: Record<string, any>;
}

export interface AuditLogFilters {
  module?: AuditModule;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  startDate?: number;
  endDate?: number;
  search?: string;
}
