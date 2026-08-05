// TanStack Query hooks for AI Project Analysis
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisService } from '../services';
import type { AnalysisCard } from '../types';
import type { AnalysisStatus } from '../types';
import { queryKeys } from '../../../constants';

export const useAnalysis = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.analysis(projectId || '');

  const { data: analysisCards = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return analysisService.listAnalysis(projectId);
    },
    enabled: !!projectId,
  });

  const runAnalysisMutation = useMutation({
    mutationFn: () => analysisService.runAnalysis(projectId || ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Optimistic status update (safe, non-destructive)
  const updateStatusMutation = useMutation({
    mutationFn: ({ analysisId, status }: { analysisId: string; status: AnalysisStatus }) =>
      analysisService.updateAnalysis(projectId || '', analysisId, { status }),
    onMutate: async ({ analysisId, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AnalysisCard[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<AnalysisCard[]>(queryKey, (old) =>
          (old || []).map((card) => (card.id === analysisId ? { ...card, status } : card))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (analysisId: string) => analysisService.deleteAnalysis(projectId || '', analysisId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    analysisCards,
    isLoading,
    isError,
    error,
    runAnalysis: runAnalysisMutation.mutate,
    runAnalysisAsync: runAnalysisMutation.mutateAsync,
    isAnalyzing: runAnalysisMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    updateStatusAsync: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export default useAnalysis;