// usePipeline - React hook for pipeline operations - migrated to TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PipelineEntity, PipelineStage } from '../types';
import pipelineService from '../services/pipelineService';
import { queryKeys } from '../../../constants';

export function usePipeline(projectId?: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.pipeline(projectId || '');

  const { data: pipeline = null, isLoading: loading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return null;
      const result = await pipelineService.startPipeline(projectId);
      return result;
    },
    enabled: !!projectId,
    // Pipeline status changes frequently; poll while running
    refetchInterval: (query) => {
      const data = query.state.data as PipelineEntity | undefined;
      if (data && (data.status === 'running' || data.status === 'pending')) {
        return 3000;
      }
      return false;
    },
  });

  const refreshPipelineMutation = useMutation({
    mutationFn: (pipelineId: string) => pipelineService.getPipelineStatus(pipelineId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const restartStageMutation = useMutation({
    mutationFn: ({ pipelineId, stage }: { pipelineId: string; stage: PipelineStage }) =>
      pipelineService.restartStage(pipelineId, stage),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const cancelPipelineMutation = useMutation({
    mutationFn: (pipelineId: string) => pipelineService.cancelPipeline(pipelineId),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const runAIPipelineMutation = useMutation({
    mutationFn: ({ providerId, autoApprove }: { providerId: string; autoApprove?: boolean }) => {
      if (!projectId) throw new Error('Missing projectId');
      return pipelineService.runAIPipeline(projectId, { providerId, autoApprove });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    pipeline,
    loading,
    isLoading: loading,
    isError,
    error: error ? (error as Error).message : null,
    startPipeline: () => queryClient.invalidateQueries({ queryKey }),
    refreshPipeline: refreshPipelineMutation.mutate,
    restartStage: restartStageMutation.mutate,
    cancelPipeline: cancelPipelineMutation.mutate,
    runAIPipeline: runAIPipelineMutation.mutateAsync,
    isRefreshing: refreshPipelineMutation.isPending,
    isRestarting: restartStageMutation.isPending,
    isCancelling: cancelPipelineMutation.isPending,
    isRunningAI: runAIPipelineMutation.isPending,
  };
}