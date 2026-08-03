// TanStack Query hooks for Knowledge Hub flows
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '../services';
import type { KnowledgeFlowFormData } from '../types';

export const useKnowledgeFlows = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['knowledge-flows', projectId];

  const { data: flows = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return knowledgeService.listFlows(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<KnowledgeFlowFormData, 'id' | 'projectId'>) =>
      knowledgeService.createFlow(projectId || '', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ flowId, ...data }: { flowId: string } & Partial<KnowledgeFlowFormData>) =>
      knowledgeService.updateFlow(projectId || '', flowId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (flowId: string) => knowledgeService.deleteFlow(projectId || '', flowId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    flows,
    isLoading,
    isError,
    error,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export default useKnowledgeFlows;