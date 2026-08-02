// TanStack Query hooks for Environment Management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { environmentService } from '../services/environmentService';
import type { EnvironmentDto } from '../services/environmentService';

// ─── Environments ──────────────────────────────────────────────

export const useEnvironments = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['environments', projectId];

  const { data: environments = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const result = await environmentService.listEnvironments(projectId);
      return result;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string; name: string; baseUrl: string; description?: string; authentication?: any; variables?: Record<string, string>; timeout?: number }) =>
      environmentService.createEnvironment(data.projectId, {
        name: data.name,
        baseUrl: data.baseUrl,
        description: data.description,
        authentication: data.authentication,
        variables: data.variables,
        timeout: data.timeout,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ environmentId, ...data }: { environmentId: string } & { name?: string; baseUrl?: string; description?: string; authentication?: any; variables?: Record<string, string>; timeout?: number; isDefault?: boolean }) =>
      environmentService.updateEnvironment(projectId || '', environmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (environmentId: string) => environmentService.deleteEnvironment(projectId || '', environmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    environments,
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

export default useEnvironments;