// AuditLogRepository - Infrastructure implementation for Audit Log Framework
// Uses in-memory storage. Can be swapped for DB implementation.

import { AuditLogEntity, AuditLogRepository } from '../../domain/audit';
import { filterAuditLogs, sortAuditLogsDescending } from './AuditLogRepositorySupport';

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private logs: Map<string, AuditLogEntity> = new Map();
  private projectLogs: Map<string, string[]> = new Map(); // projectId -> log ids

  async create(log: AuditLogEntity): Promise<AuditLogEntity> {
    this.logs.set(log.id, log);
    
    if (!this.projectLogs.has(log.projectId)) {
      this.projectLogs.set(log.projectId, []);
    }
    this.projectLogs.get(log.projectId)!.push(log.id);
    
    return log;
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    return this.logs.get(id) || null;
  }

  async findByProject(projectId: string): Promise<AuditLogEntity[]> {
    const logIds = this.projectLogs.get(projectId) || [];
    return logIds
      .map(id => this.logs.get(id))
      .filter((log): log is AuditLogEntity => log !== undefined);
  }

  async findByProjectAndFilters(
    projectId: string,
    filters?: {
      module?: string;
      entityType?: string;
      entityId?: string;
      action?: string;
      startDate?: number;
      endDate?: number;
    }
  ): Promise<AuditLogEntity[]> {
    return sortAuditLogsDescending(filterAuditLogs(await this.findByProject(projectId), filters));
  }

  async list(): Promise<AuditLogEntity[]> {
    return sortAuditLogsDescending(Array.from(this.logs.values()));
  }
}

export default InMemoryAuditLogRepository;
