// Versioning hooks
import { useState, useEffect, useCallback } from 'react';
import { versioningService } from '../services';
import type { Version, VersionComparison, EntityType } from '../types';

export function useVersions(projectId: string | null, entityType?: EntityType, entityId?: string) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await versioningService.listVersions(projectId, entityType, entityId);
      setVersions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  }, [projectId, entityType, entityId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return { versions, loading, error, refetch: fetchVersions };
}

export function useVersionComparison(projectId: string | null) {
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async (versionId1: string, versionId2: string) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await versioningService.compareVersions(projectId, versionId1, versionId2);
      setComparison(data);
    } catch (err: any) {
      setError(err.message || 'Failed to compare versions');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  return { comparison, loading, error, compare };
}