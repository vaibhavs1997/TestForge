// Versioning hooks - migrated to TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versioningService } from '../services';
import type { Version, VersionComparison, EntityType } from '../types';
import { queryKeys } from '../../../constants';

export function useVersions(projectId: string | null, entityType?: EntityType, entityId?: string) {
  const queryKey = queryKeys.versions(projectId || '', entityType, entityId);

  const { data: versions = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return versioningService.listVersions(projectId, entityType, entityId);
    },
    enabled: !!projectId,
  });

  return { versions, loading, isLoading: loading, isError, error, refetch };
}

export function useVersionComparison(projectId: string | null) {
  const queryClient = useQueryClient();

  const compareMutation = useMutation({
    mutationFn: ({ versionId1, versionId2 }: { versionId1: string; versionId2: string }) => {
      if (!projectId) throw new Error('Missing projectId');
      return versioningService.compareVersions(projectId, versionId1, versionId2);
    },
  });

  return {
    comparison: compareMutation.data ?? null,
    loading: compareMutation.isPending,
    error: compareMutation.error ? (compareMutation.error as Error).message : null,
    compare: compareMutation.mutate,
  };
}

export function useRestoreVersion(projectId: string | null) {
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: string }) => {
      if (!projectId) throw new Error('Missing projectId');
      return versioningService.restoreVersion(projectId, versionId);
    },
    onSuccess: () => {
      // Invalidate all version queries for this project
      queryClient.invalidateQueries({ queryKey: ['versions', projectId || ''] });
    },
  });

  return {
    restore: restoreMutation.mutate,
    restoredVersion: restoreMutation.data ?? null,
    isRestoring: restoreMutation.isPending,
    error: restoreMutation.error ? (restoreMutation.error as Error).message : null,
  };
}