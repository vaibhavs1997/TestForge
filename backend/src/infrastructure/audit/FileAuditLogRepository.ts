import * as path from 'node:path';
import { AuditLogEntity, AuditLogRepository } from '../../domain/audit';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function logsFilePath(): string {
  return path.join(process.cwd(), 'data', 'audit', 'logs.json');
}

function reviveLog(raw: Record<string, unknown>): AuditLogEntity {
  return new AuditLogEntity(
    String(raw.id),
    String(raw.projectId),
    raw.module as AuditLogEntity['module'],
    String(raw.entityType),
    String(raw.entityId),
    raw.action as AuditLogEntity['action'],
    String(raw.performedBy ?? 'System'),
    Number(raw.timestamp),
    (raw.oldValue as Record<string, unknown> | null) ?? null,
    (raw.newValue as Record<string, unknown> | null) ?? null,
    (raw.metadata as Record<string, unknown>) ?? {},
  );
}

export class FileAuditLogRepository implements AuditLogRepository {
  private async readAll(): Promise<AuditLogEntity[]> {
    const rows = await readJsonArray<Record<string, unknown>>(logsFilePath());
    return rows.map(reviveLog);
  }

  private async writeAll(logs: AuditLogEntity[]): Promise<void> {
    await writeJsonArray(logsFilePath(), logs);
  }

  async create(log: AuditLogEntity): Promise<AuditLogEntity> {
    const logs = await this.readAll();
    logs.push(log);
    await this.writeAll(logs);
    return log;
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    const logs = await this.readAll();
    return logs.find((l) => l.id === id) ?? null;
  }

  async findByProject(projectId: string): Promise<AuditLogEntity[]> {
    const logs = await this.readAll();
    return logs.filter((l) => l.projectId === projectId);
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
    },
  ): Promise<AuditLogEntity[]> {
    let logs = await this.findByProject(projectId);

    if (filters) {
      if (filters.module) {
        logs = logs.filter((log) => log.module === filters.module);
      }
      if (filters.entityType) {
        logs = logs.filter((log) => log.entityType === filters.entityType);
      }
      if (filters.entityId) {
        logs = logs.filter((log) => log.entityId === filters.entityId);
      }
      if (filters.action) {
        logs = logs.filter((log) => log.action === filters.action);
      }
      if (filters.startDate) {
        logs = logs.filter((log) => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter((log) => log.timestamp <= filters.endDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  async list(): Promise<AuditLogEntity[]> {
    const logs = await this.readAll();
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }
}

export default FileAuditLogRepository;
