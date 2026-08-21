// Maps audit activity to user-facing inbox notifications (all projects).
import { AuditLogEntity } from '../../domain/audit/AuditLogEntity.js';

export interface NotificationInboxItem {
  id: string;
  projectId: string;
  title: string;
  message: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: number;
  severity: 'info' | 'success' | 'warning' | 'error';
}

function severityFor(action: string): NotificationInboxItem['severity'] {
  if (action === 'DELETE' || action === 'REJECT') return 'error';
  if (action === 'EXECUTE' || action === 'FAILED') return 'warning';
  if (action === 'CREATE' || action === 'APPROVE' || action === 'GENERATE') return 'success';
  return 'info';
}

function titleFor(log: AuditLogEntity): string {
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

function messageFor(log: AuditLogEntity): string {
  const parts = [
    `Project ${log.projectId}`,
    log.entityType !== 'Unknown' ? log.entityType : log.module,
  ];
  if (log.metadata?.status) {
    parts.push(String(log.metadata.status));
  }
  return parts.join(' · ');
}

export function mapAuditLogToInboxItem(log: AuditLogEntity): NotificationInboxItem {
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

export function mapAuditLogsToInbox(logs: AuditLogEntity[]): NotificationInboxItem[] {
  return logs.map(mapAuditLogToInboxItem);
}
