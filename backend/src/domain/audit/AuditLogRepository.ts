// AuditLogRepository - Domain Repository for Audit Log Framework
// Handles persistence operations for AuditLogEntity.

import { AuditLogEntity } from './AuditLogEntity';

export interface AuditLogRepository {
  create(log: AuditLogEntity): Promise<AuditLogEntity>;
  findById(id: string): Promise<AuditLogEntity | null>;
  findByProject(projectId: string): Promise<AuditLogEntity[]>;
  findByProjectAndFilters(
    projectId: string,
    filters?: {
      module?: string;
      entityType?: string;
      entityId?: string;
      action?: string;
      startDate?: number;
      endDate?: number;
    }
  ): Promise<AuditLogEntity[]>;
  list(): Promise<AuditLogEntity[]>;
}

export default AuditLogRepository;