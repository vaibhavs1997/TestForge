// TanStack Query hooks for AI Project Analysis
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analysisService } from '../services';
import type { AnalysisStatus } from '../types';

export const useAnalysis = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['analysis', projectId];

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

  const updateStatusMutation = useMutation({
    mutationFn: ({ analysisId, status }: { analysisId: string; status: AnalysisStatus }) =>
      analysisService.updateAnalysis(projectId || '', analysisId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
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