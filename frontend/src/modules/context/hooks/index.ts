// Project Context hooks
import { useState, useEffect, useCallback } from 'react';
import { projectContextService } from '../services';
import type { ProjectContext } from '../types';

export function useProjectContext(projectId: string | null) {
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await projectContextService.getProjectContext(projectId);
      setContext(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project context');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return { context, loading, error, refetch: fetchContext };
}