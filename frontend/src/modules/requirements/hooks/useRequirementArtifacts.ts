import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testDesignService, executionPlanService } from '../services/testDesignService';
import type { TestDesign, DesignStatus, ExecutionPlan, RequestOverride } from '../types';
import { queryKeys } from '../../../constants';

export function useRequirementArtifacts(projectId?: string, requirementId?: string) {
  const queryClient = useQueryClient();
  const designsKey = queryKeys.testDesigns(projectId ?? '', requirementId || '');
  const plansKey = queryKeys.executionPlansForRequirement(projectId ?? '', requirementId || '');

  const designsQuery = useQuery({
    queryKey: designsKey,
    queryFn: () => projectId ? testDesignService.listByRequirement(projectId, requirementId!) : Promise.resolve([]),
    enabled: !!projectId && !!requirementId,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });

  const plansQuery = useQuery({
    queryKey: plansKey,
    queryFn: () => projectId ? executionPlanService.listByRequirement(projectId, requirementId!) : Promise.resolve([]),
    enabled: !!projectId && !!requirementId,
  });

  const updateDesignMutation = useMutation({
    mutationFn: ({
      designId,
      status,
      operationId,
      requestOverrides,
      rebuildPayload,
    }: {
      designId: string;
      status?: DesignStatus;
      operationId?: string;
      requestOverrides?: RequestOverride;
      rebuildPayload?: boolean;
    }) =>
      projectId ? testDesignService.updateDesign(projectId, designId, {
        status,
        operationId,
        requestOverrides,
        rebuildPayload,
      }) : Promise.reject(new Error('Project context is required')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: designsKey }),
  });

  const updateDesignStatusMutation = useMutation({
    mutationFn: ({ designId, status }: { designId: string; status: DesignStatus }) =>
      projectId ? testDesignService.updateStatus(projectId, designId, status) : Promise.reject(new Error('Project context is required')),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: designsKey }),
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ planId, status }: { planId: string; status: ExecutionPlan['status'] }) =>
      projectId ? executionPlanService.updateStatus(projectId, planId, status) : Promise.reject(new Error('Project context is required')),
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
    updateDesignStatus: updateDesignStatusMutation.mutateAsync,
    updateDesign: updateDesignMutation.mutateAsync,
    updatePlanStatus: updatePlanMutation.mutateAsync,
    isUpdatingDesign: updateDesignStatusMutation.isPending || updateDesignMutation.isPending,
    isUpdatingMapping: updateDesignMutation.isPending,
  };
}

export default useRequirementArtifacts;
