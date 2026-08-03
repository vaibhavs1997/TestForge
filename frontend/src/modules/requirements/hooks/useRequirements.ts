// TanStack Query hooks for Requirement Workspace
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requirementService } from '../services/requirementService';
import type { Requirement, ApprovalStatus, ValidationReport, TestStrategy, TestDesign } from '../types';

export const useRequirements = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['requirements', projectId];

  const { data: requirements = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return requirementService.listRequirements(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string } & Omit<Requirement, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>) =>
      requirementService.createRequirement(data.projectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ requirementId, projectId, ...data }: { requirementId: string; projectId: string } & Partial<Requirement>) =>
      requirementService.updateRequirement(projectId, requirementId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ projectId, requirementId }: { projectId: string; requirementId: string }) =>
      requirementService.deleteRequirement(projectId, requirementId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const generateFromAnalysisMutation = useMutation({
    mutationFn: ({ projectId, analysisId }: { projectId: string; analysisId: string }) =>
      requirementService.generateFromAnalysis(projectId, analysisId),
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

  const suggested = requirements.filter(r => r.approvalStatus === 'Suggested');
  const approved = requirements.filter(r => r.approvalStatus === 'Approved');
  const archived = requirements.filter(r => r.approvalStatus === 'Archived' || r.approvalStatus === 'Rejected');

  return {
    requirements,
    suggested,
    approved,
    archived,
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
    generateFromAnalysis: generateFromAnalysisMutation.mutate,
    generateFromAnalysisAsync: generateFromAnalysisMutation.mutateAsync,
    isGenerating: generateFromAnalysisMutation.isPending,
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
  };
};

export default useRequirements;