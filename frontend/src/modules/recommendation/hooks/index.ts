// Recommendation hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recommendationService } from '../services';
import type { Recommendation } from '../types';

export function useRecommendations(projectId: string) {
  return useQuery({
    queryKey: ['recommendations', projectId],
    queryFn: () => recommendationService.analyzeProject(projectId),
    enabled: !!projectId,
  });
}