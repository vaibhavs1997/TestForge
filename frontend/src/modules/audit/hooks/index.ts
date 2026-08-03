// Audit Log hooks
import { useState, useEffect, useCallback } from 'react';
import { auditService } from '../services';
import type { AuditLog, AuditLogFilters } from '../types';

export function useAuditLogs(projectId: string | null, filters?: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getAuditLogs(projectId, filters);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}