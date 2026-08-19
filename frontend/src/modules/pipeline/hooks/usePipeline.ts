// usePipeline - React hook for pipeline operations - migrated to TanStack Query
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { PipelineEntity, PipelineStage } from '../types';
import pipelineService from '../services/pipelineService';
import { queryKeys } from '../../../constants';

export function usePipeline(projectId?: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.pipeline(projectId || '');

  const { data, isLoading: loading, isError, error } = useCRUD({
    queryKey,
    service: {
      list: () => (projectId ? pipelineService.getProjectPipelines(projectId) : Promise.resolve([])),
      create: () => Promise.resolve({} as any),
      update: () => Promise.resolve({} as any),
      delete: () => Promise.resolve(),
    },
    enabled: !!projectId,
    listOptions: {
      refetchInterval: (query) => {
        const pipelineData = query.state.data as PipelineEntity[] | undefined;
        if (pipelineData && pipelineData.length > 0) {
          const pipeline = pipelineData[0];
          if (pipeline.status === 'running' || pipeline.status === 'pending') {
            return 3000;
          }
        }
        return false;
      },
    },
  });

  const pipeline = data.length > 0 ? data[0] : null;

  const refreshPipelineMutation = useMutation({
    mutationFn: (pipelineId: string) => pipelineService.getPipelineStatus(pipelineId),
    onSuccess: (pipelineData) => {
      queryClient.setQueryData(queryKey, [pipelineData]);
    },
  });

  const startPipelineMutation = useMutation({
    mutationFn: () => {
      if (!projectId) throw new Error('Missing projectId');
      return pipelineService.startPipeline(projectId);
    },
    onSuccess: (pipelineData) => {
      queryClient.setQueryData(queryKey, [pipelineData]);
    },
  });

  const restartStageMutation = useMutation({
    mutationFn: ({ pipelineId, stage }: { pipelineId: string; stage: PipelineStage }) =>
      pipelineService.restartStage(pipelineId, stage),
    onSuccess: (pipelineData) => {
      queryClient.setQueryData(queryKey, [pipelineData]);
    },
  });

  const cancelPipelineMutation = useMutation({
    mutationFn: (pipelineId: string) => pipelineService.cancelPipeline(pipelineId),
    onSuccess: (pipelineData) => {
      queryClient.setQueryData(queryKey, [pipelineData]);
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
    startPipeline: startPipelineMutation.mutateAsync,
    refreshPipeline: refreshPipelineMutation.mutate,
    restartStage: restartStageMutation.mutate,
    cancelPipeline: cancelPipelineMutation.mutate,
    runAIPipeline: runAIPipelineMutation.mutateAsync,
    isRefreshing: refreshPipelineMutation.isPending,
    isStarting: startPipelineMutation.isPending,
    isRestarting: restartStageMutation.isPending,
    isCancelling: cancelPipelineMutation.isPending,
    isRunningAI: runAIPipelineMutation.isPending,
  };
}
