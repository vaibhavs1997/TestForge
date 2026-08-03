// AuditLogRepository - Infrastructure implementation for Audit Log Framework
// Uses in-memory storage. Can be swapped for DB implementation.

import { AuditLogEntity, AuditLogRepository } from '../../domain/audit';

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
    let logs = await this.findByProject(projectId);
    
    if (filters) {
      if (filters.module) {
        logs = logs.filter(log => log.module === filters.module);
      }
      if (filters.entityType) {
        logs = logs.filter(log => log.entityType === filters.entityType);
      }
      if (filters.entityId) {
        logs = logs.filter(log => log.entityId === filters.entityId);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
    }
    
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  async list(): Promise<AuditLogEntity[]> {
    return Array.from(this.logs.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

export default InMemoryAuditLogRepository;