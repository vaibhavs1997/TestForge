// TanStack Query hooks for Execution module
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executionService } from '../services';
import type { ExecutionRun, ExecutionRunCreatePayload } from '../types';

export const useExecution = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['executions', projectId];

  const { data: runs = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return executionService.listExecutions(projectId);
    },
    enabled: !!projectId,
    refetchInterval: 2000, // Poll every 2 seconds for running executions
  });

  const startMutation = useMutation({
    mutationFn: ({ projectId, executionPlanId, failureMode }: ExecutionRunCreatePayload & { projectId: string }) =>
      executionService.startExecution(projectId, executionPlanId, failureMode),
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