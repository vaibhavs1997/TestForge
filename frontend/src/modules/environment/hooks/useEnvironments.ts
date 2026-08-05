// TanStack Query hooks for Environment Management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { environmentService } from '../services/environmentService';
import type { EnvironmentDto } from '../services/environmentService';
import { queryKeys } from '../../../constants';

// ─── Environments ──────────────────────────────────────────────

export const useEnvironments = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.environments(projectId || '');

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

  // Optimistic update for environment edits (safe, non-destructive)
  const updateMutation = useMutation({
    mutationFn: ({ environmentId, ...data }: { environmentId: string } & { name?: string; baseUrl?: string; description?: string; authentication?: any; variables?: Record<string, string>; timeout?: number; isDefault?: boolean }) =>
      environmentService.updateEnvironment(projectId || '', environmentId, data),
    onMutate: async ({ environmentId, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<EnvironmentDto[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<EnvironmentDto[]>(queryKey, (old) =>
          (old || []).map((env) => (env.id === environmentId ? { ...env, ...data } : env))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
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