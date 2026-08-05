// TanStack Query hooks for Environment Management
import { useQueryClient } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { environmentService } from '../services/environmentService';
import type { EnvironmentDto } from '../services/environmentService';
import { queryKeys } from '../../../constants';

// ─── Environments ──────────────────────────────────────────────

export const useEnvironments = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.environments(projectId || '');

  const { data, isLoading, isError, error, create, update, remove, isCreating, isUpdating, isDeleting } = useCRUD({
    queryKey,
    service: {
      list: () => (projectId ? environmentService.listEnvironments(projectId) : Promise.resolve([])),
      create: (input: { projectId: string; name: string; baseUrl: string; description?: string; authentication?: any; variables?: Record<string, string>; timeout?: number }) =>
        environmentService.createEnvironment(input.projectId, {
          name: input.name,
          baseUrl: input.baseUrl,
          description: input.description,
          authentication: input.authentication,
          variables: input.variables,
          timeout: input.timeout,
        }),
      update: (environmentId: string, input: { name?: string; baseUrl?: string; description?: string; authentication?: any; variables?: Record<string, string>; timeout?: number; isDefault?: boolean }) =>
        environmentService.updateEnvironment(projectId || '', environmentId, input),
      delete: (environmentId: string) => environmentService.deleteEnvironment(projectId || '', environmentId),
    },
    enabled: !!projectId,
    updateOptions: {
      onMutate: async ({ id: environmentId, data: updateData }: any) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<EnvironmentDto[]>(queryKey);
        if (previous) {
          queryClient.setQueryData<EnvironmentDto[]>(queryKey, (old) =>
            (old || []).map((env) => (env.id === environmentId ? { ...env, ...updateData } : env))
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
      },
    },
  });

  return {
    environments: data,
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
  };
};

export default useEnvironments;