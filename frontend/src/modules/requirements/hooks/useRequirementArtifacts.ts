import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testDesignService, executionPlanService } from '../services/testDesignService';
import type { TestDesign, DesignStatus, ExecutionPlan } from '../types';
import { queryKeys } from '../../../constants';

export function useRequirementArtifacts(projectId: string, requirementId?: string) {
  const queryClient = useQueryClient();
  const designsKey = queryKeys.testDesigns(projectId, requirementId || '');
  const plansKey = queryKeys.executionPlansForRequirement(projectId, requirementId || '');

  const designsQuery = useQuery({
    queryKey: designsKey,
    queryFn: () => testDesignService.listByRequirement(projectId, requirementId!),
    enabled: !!projectId && !!requirementId,
  });

  const plansQuery = useQuery({
    queryKey: plansKey,
    queryFn: () => executionPlanService.listByRequirement(projectId, requirementId!),
    enabled: !!projectId && !!requirementId,
  });

  const updateDesignMutation = useMutation({
    mutationFn: ({ designId, status }: { designId: string; status: DesignStatus }) =>
      testDesignService.updateStatus(projectId, designId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: designsKey }),
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, status }: { planId: string; status: ExecutionPlan['status'] }) =>
      executionPlanService.updateStatus(projectId, planId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: plansKey }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: designsKey });
    queryClient.invalidateQueries({ queryKey: plansKey });
  };

  const designs: TestDesign[] = designsQuery.data ?? [];
  const executionPlans: ExecutionPlan[] = plansQuery.data ?? [];
  const includedDesignCount = designs.filter((d) => d.status !== 'Disabled').length;

  return {
    designs,
    executionPlans,
    includedDesignCount,
    isLoadingDesigns: designsQuery.isLoading,
    isLoadingPlans: plansQuery.isLoading,
    refetchDesigns: designsQuery.refetch,
    refetchPlans: plansQuery.refetch,
    invalidateArtifacts: invalidate,
    updateDesignStatus: updateDesignMutation.mutateAsync,
    updatePlanStatus: updatePlanMutation.mutateAsync,
    isUpdatingDesign: updateDesignMutation.isPending,
  };
}

export default useRequirementArtifacts;
