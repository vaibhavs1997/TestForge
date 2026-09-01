import * as path from 'node:path';
import { AuditLogEntity, AuditLogRepository } from '../../domain/audit/index.js';
import { readJsonArray, updateJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';
import { filterAuditLogs, sortAuditLogsDescending } from './AuditLogRepositorySupport.js';

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

  async delete(id: string): Promise<boolean> {
    let deleted = false;
    await updateJsonArray<Record<string, unknown>>(logsFilePath(), [], (logs) => {
      const remaining = logs.filter((log) => String(log.id) !== id);
      deleted = remaining.length !== logs.length;
      return remaining;
    });
    return deleted;
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
    return sortAuditLogsDescending(filterAuditLogs(await this.findByProject(projectId), filters));
  }

  async list(): Promise<AuditLogEntity[]> {
    return sortAuditLogsDescending(await this.readAll());
  }
}

export default FileAuditLogRepository;
