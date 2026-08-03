// TanStack Query hooks for Test Suite Management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suiteService } from '../services';
import type { TestSuite, TestSuiteFormData } from '../types';

export const useSuites = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['suites', projectId];

  const { data: suites = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return suiteService.listSuites(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string } & TestSuiteFormData) =>
      suiteService.createSuite(data.projectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ suiteId, projectId, ...data }: { suiteId: string; projectId: string } & Partial<TestSuiteFormData>) =>
      suiteService.updateSuite(projectId, suiteId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ projectId, suiteId }: { projectId: string; suiteId: string }) =>
      suiteService.deleteSuite(projectId, suiteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const addExecutionPlanMutation = useMutation({
    mutationFn: ({ projectId, suiteId, executionPlanId }: { projectId: string; suiteId: string; executionPlanId: string }) =>
      suiteService.addExecutionPlan(projectId, suiteId, executionPlanId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeExecutionPlanMutation = useMutation({
    mutationFn: ({ projectId, suiteId, executionPlanId }: { projectId: string; suiteId: string; executionPlanId: string }) =>
      suiteService.removeExecutionPlan(projectId, suiteId, executionPlanId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const reorderExecutionPlansMutation = useMutation({
    mutationFn: ({ projectId, suiteId, orderedPlanIds }: { projectId: string; suiteId: string; orderedPlanIds: string[] }) =>
      suiteService.reorderExecutionPlans(projectId, suiteId, orderedPlanIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    suites,
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
    addExecutionPlan: addExecutionPlanMutation.mutate,
    addExecutionPlanAsync: addExecutionPlanMutation.mutateAsync,
    isAddingExecutionPlan: addExecutionPlanMutation.isPending,
    removeExecutionPlan: removeExecutionPlanMutation.mutate,
    removeExecutionPlanAsync: removeExecutionPlanMutation.mutateAsync,
    isRemovingExecutionPlan: removeExecutionPlanMutation.isPending,
    reorderExecutionPlans: reorderExecutionPlansMutation.mutate,
    reorderExecutionPlansAsync: reorderExecutionPlansMutation.mutateAsync,
    isReordering: reorderExecutionPlansMutation.isPending,
  };
};

export default useSuites;