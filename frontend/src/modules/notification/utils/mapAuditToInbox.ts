import type { AuditLog } from '../../audit/types';
import type { NotificationInboxItem } from '../types/inbox';

function severityFor(action: string): NotificationInboxItem['severity'] {
  if (action === 'DELETE' || action === 'REJECT') return 'error';
  if (action === 'EXECUTE' || action === 'FAILED') return 'warning';
  if (action === 'CREATE' || action === 'APPROVE' || action === 'GENERATE') return 'success';
  return 'info';
}

function titleFor(log: AuditLog): string {
  const status = log.metadata?.status ?? log.newValue?.status;
  if (log.module === 'Execution') {
    return status === 'Failed' || status === 'FAILED' ? 'Execution failed' : 'Execution completed';
  }
  if (log.module === 'Scheduler') {
    return status === 'failed' ? 'Scheduled run failed' : 'Scheduled run completed';
  }
  if (log.module === 'Report') {
    return 'Report generated';
  }
  return `${log.module} ${log.action.toLowerCase()}`;
}

function messageFor(log: AuditLog): string {
  const parts = [
    `Project ${log.projectId}`,
    log.entityType !== 'Unknown' ? log.entityType : log.module,
  ];
  if (log.metadata?.status) {
    parts.push(String(log.metadata.status));
  }
  return parts.join(' · ');
}

export function mapAuditLogToInboxItem(log: AuditLog): NotificationInboxItem {
  return {
    id: log.id,
    projectId: log.projectId,
    title: titleFor(log),
    message: messageFor(log),
    module: log.module,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    timestamp: log.timestamp,
    severity: severityFor(log.action),
  };
}

export function mapAuditLogsToInbox(logs: AuditLog[]): NotificationInboxItem[] {
  return logs.map(mapAuditLogToInboxItem);
}
