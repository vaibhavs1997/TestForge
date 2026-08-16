import { AuditLogEntity } from '../../domain/audit';

export interface AuditLogFilters {
  module?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: number;
  endDate?: number;
}

export function sortAuditLogsDescending(logs: AuditLogEntity[]): AuditLogEntity[] {
  return [...logs].sort((a, b) => b.timestamp - a.timestamp);
}

export function filterAuditLogs(
  logs: AuditLogEntity[],
  filters?: AuditLogFilters
): AuditLogEntity[] {
  if (!filters) {
    return logs;
  }

  return logs.filter((log) => {
    if (filters.module && log.module !== filters.module) return false;
    if (filters.entityType && log.entityType !== filters.entityType) return false;
    if (filters.entityId && log.entityId !== filters.entityId) return false;
    if (filters.action && log.action !== filters.action) return false;
    if (filters.startDate !== undefined && log.timestamp < filters.startDate) return false;
    if (filters.endDate !== undefined && log.timestamp > filters.endDate) return false;
    return true;
  });
}
