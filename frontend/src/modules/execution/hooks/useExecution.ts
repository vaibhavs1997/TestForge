// TanStack Query hooks for Execution module
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executionService } from '../services';
import type { ExecutionRun, ExecutionRunCreatePayload } from '../types';
import { queryKeys } from '../../../constants';

export const useExecution = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.executions(projectId || '');

  const { data: runs = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return executionService.listExecutions(projectId);
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data as ExecutionRun[];
      if (!data || data.length === 0) return false;
      const hasRunning = data.some(run => run.status === 'Running');
      if (!hasRunning) return false;
      return 3000; // Poll every 3 seconds while executions are running
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ projectId, executionPlanId, failureMode, executionProfileId }: ExecutionRunCreatePayload & { projectId: string }) =>
      executionService.startExecution(projectId, executionPlanId, failureMode, executionProfileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    runs,
    isLoading,
    isError,
    error,
    startExecution: startMutation.mutate,
    startExecutionAsync: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
  };
};

export default useExecution;