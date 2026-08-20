// TanStack Query hooks for Execution module
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { executionService } from '../services';
import type { ExecutionRun, ExecutionRunCreatePayload } from '../types';
import { queryKeys } from '../../../constants';

export const useExecution = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.executions(projectId || '');

  const { data, isLoading, isError, error, refetch } = useCRUD({
    queryKey,
    service: {
      list: () => (projectId ? executionService.listExecutions(projectId) : Promise.resolve([])),
      create: () => Promise.resolve({} as any),
      update: () => Promise.resolve({} as any),
      delete: () => Promise.resolve(),
    },
    enabled: !!projectId,
    listOptions: {
      refetchInterval: (query) => {
        const runs = query.state.data as ExecutionRun[];
        if (!runs || runs.length === 0) return false;
        const hasRunning = runs.some(run => run.status === 'Running');
        if (!hasRunning) return false;
        return 3000; // Poll every 3 seconds while executions are running
      },
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ projectId, executionPlanId, failureMode, executionProfileId }: ExecutionRunCreatePayload & { projectId: string }) =>
      executionService.startExecution(projectId, executionPlanId, failureMode, executionProfileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ projectId, runId }: { projectId: string; runId: string }) => executionService.deleteExecution(projectId, runId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: (projectId: string) => executionService.deleteAllExecutions(projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    // Keep consumers render-safe while the query is loading or unauthorized.
    // ReportPage derives filters from runs and must not crash on undefined data.
    runs: data ?? [],
    isLoading,
    isError,
    error,
    refetch,
    startExecution: startMutation.mutate,
    startExecutionAsync: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    deleteExecutionAsync: deleteMutation.mutateAsync,
    deleteAllExecutionsAsync: deleteAllMutation.mutateAsync,
    isDeleting: deleteMutation.isPending || deleteAllMutation.isPending,
  };
};

export default useExecution;
