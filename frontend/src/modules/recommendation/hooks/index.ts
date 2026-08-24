// Recommendation hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationService } from '../services';
import type { Recommendation } from '../types';
import { queryKeys } from '../../../constants';

export function useRecommendations(projectId?: string) {
  const queryKey = queryKeys.recommendations(projectId ?? '');

  const { data: recommendations = [], isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () => projectId ? recommendationService.analyzeProject(projectId) : Promise.resolve([]),
    enabled: !!projectId,
  });

  return {
    data: recommendations,
    recommendations,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  };
}
