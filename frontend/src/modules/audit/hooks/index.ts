// Audit Log hooks - migrated to TanStack Query
import { useQuery } from '@tanstack/react-query';
import { auditService } from '../services';
import type { AuditLog, AuditLogFilters } from '../types';
import { queryKeys } from '../../../constants';

export function useAuditLogs(projectId: string | null, filters?: AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.auditLogs(projectId || ''),
    queryFn: () => auditService.getAuditLogs(projectId || '', filters),
    enabled: !!projectId,
  });
}

export function useAuditLog(projectId: string | null, auditLogId: string) {
  return useQuery({
    queryKey: queryKeys.auditLog(projectId || '', auditLogId),
    queryFn: () => auditService.getAuditLogs(projectId || '', {}),
    enabled: !!projectId && !!auditLogId,
    select: (logs: AuditLog[]) => logs.find((log) => log.id === auditLogId) || null,
  });
}