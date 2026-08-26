// TanStack Query hooks for Requirement Workspace
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { requirementService } from '../services/requirementService';
import type { Requirement, ApprovalStatus, ValidationReport, TestStrategy, TestDesign, ExecutionPlan } from '../types';
import { queryKeys } from '../../../constants';

export const useRequirements = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.requirements(projectId || '');

  const { data, isLoading, isError, error, create, update, remove, isCreating, isUpdating, isDeleting } = useCRUD({
    queryKey,
    service: {
      list: () => (projectId ? requirementService.listRequirements(projectId) : Promise.resolve([])),
      create: (input: { projectId: string } & Omit<Requirement, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) =>
        requirementService.createRequirement(input.projectId, input),
      update: (requirementId: string, input: Partial<Requirement>) =>
        requirementService.updateRequirement(projectId || '', requirementId, input),
      delete: (requirementId: string) => requirementService.deleteRequirement(projectId || '', requirementId),
    },
    enabled: !!projectId,
    updateOptions: {
      onMutate: async ({ id: requirementId, data: updateData }: any) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<Requirement[]>(queryKey);
        if (previous) {
          queryClient.setQueryData<Requirement[]>(queryKey, (old) =>
            (old || []).map((req) => (req.id === requirementId ? { ...req, ...updateData } : req))
          );
        }
        return { previous };
      },
      onError: (_err: any, _vars: any, context: any) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: ['requirements'], exact: false });
      },
    },
  });

  // Custom mutations for special operations
  const generateFromAnalysisMutation = useMutation({
    mutationFn: ({ projectId, analysisId }: { projectId: string; analysisId: string }) =>
      requirementService.generateFromAnalysis(projectId, analysisId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const generateWithAIMutation = useMutation({
    mutationFn: ({ projectId, providerId, previewOnly }: { projectId: string; providerId: string; previewOnly?: boolean }) =>
      requirementService.generateWithAI(projectId, { providerId, previewOnly }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const validateReadinessMutation = useMutation({
    mutationFn: ({ projectId, requirementId }: { projectId: string; requirementId: string }) =>
      requirementService.validateReadiness(projectId, requirementId),
  });

  const planTestStrategyMutation = useMutation({
    mutationFn: ({ projectId, requirementId }: { projectId: string; requirementId: string }) =>
      requirementService.planTestStrategy(projectId, requirementId),
  });

  const generateTestDesignsMutation = useMutation({
    mutationFn: ({ projectId, requirementId }: { projectId: string; requirementId: string }) =>
      requirementService.generateTestDesigns(projectId, requirementId),
  });

  const planExecutionMutation = useMutation({
    mutationFn: ({ projectId, requirementId }: { projectId: string; requirementId: string }) =>
      requirementService.planExecution(projectId, requirementId),
  });

  const suggested = data.filter(r => r.approvalStatus === 'Suggested');
  const approved = data.filter(r => r.approvalStatus === 'Approved');
  const archived = data.filter(r => r.approvalStatus === 'Archived' || r.approvalStatus === 'Rejected');
  const activeRequirements = data.filter(
    r => r.approvalStatus !== 'Archived' && r.approvalStatus !== 'Rejected',
  );

  return {
    requirements: data,
    activeRequirements,
    suggested,
    approved,
    archived,
    isLoading,
    isError,
    error,
    create,
    createAsync: create,
    isCreating,
    update,
    updateAsync: update,
    isUpdating,
    remove,
    removeAsync: remove,
    isDeleting,
    generateFromAnalysis: generateFromAnalysisMutation.mutate,
    generateFromAnalysisAsync: generateFromAnalysisMutation.mutateAsync,
    isGenerating: generateFromAnalysisMutation.isPending,
    generateWithAI: generateWithAIMutation.mutate,
    generateWithAIAsync: generateWithAIMutation.mutateAsync,
    isGeneratingWithAI: generateWithAIMutation.isPending,
    aiGenerateResult: generateWithAIMutation.data,
    validateReadiness: validateReadinessMutation.mutate,
    validateReadinessAsync: validateReadinessMutation.mutateAsync,
    isValidating: validateReadinessMutation.isPending,
    validationResult: validateReadinessMutation.data,
    planTestStrategy: planTestStrategyMutation.mutate,
    planTestStrategyAsync: planTestStrategyMutation.mutateAsync,
    isPlanningStrategy: planTestStrategyMutation.isPending,
    testStrategy: planTestStrategyMutation.data,
    generateTestDesigns: generateTestDesignsMutation.mutate,
    generateTestDesignsAsync: generateTestDesignsMutation.mutateAsync,
    isGeneratingDesigns: generateTestDesignsMutation.isPending,
    testDesigns: generateTestDesignsMutation.data,
    planExecution: planExecutionMutation.mutate,
    planExecutionAsync: planExecutionMutation.mutateAsync,
    isPlanningExecution: planExecutionMutation.isPending,
    executionPlans: planExecutionMutation.data,
  };
};

export default useRequirements;
