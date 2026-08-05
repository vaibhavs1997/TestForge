// Plugin hooks - migrated to TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pluginService } from '../services';
import type { Plugin, PluginCategory, PluginHealth } from '../types';
import { queryKeys } from '../../../constants';

export function usePlugins(filters?: { category?: PluginCategory; projectId?: string; enabled?: boolean }) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.plugins(filters as { category?: string; projectId?: string; enabled?: boolean } | undefined);

  const { data: plugins = [], isLoading: loading, isError, error } = useQuery({
    queryKey,
    queryFn: () => pluginService.listPlugins(filters),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof pluginService.createPlugin>[0]) =>
      pluginService.createPlugin(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  // Optimistic enable (safe, non-destructive)
  const enableMutation = useMutation({
    mutationFn: (pluginId: string) => pluginService.enablePlugin(pluginId),
    onMutate: async (pluginId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Plugin[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Plugin[]>(queryKey, (old) =>
          (old || []).map((p) => (p.id === pluginId ? { ...p, enabled: true } : p))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  // Optimistic disable (safe, non-destructive)
  const disableMutation = useMutation({
    mutationFn: (pluginId: string) => pluginService.disablePlugin(pluginId),
    onMutate: async (pluginId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Plugin[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Plugin[]>(queryKey, (old) =>
          (old || []).map((p) => (p.id === pluginId ? { ...p, enabled: false } : p))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  const updateConfigurationMutation = useMutation({
    mutationFn: ({ pluginId, configuration }: { pluginId: string; configuration: Record<string, any> }) =>
      pluginService.updateConfiguration(pluginId, configuration),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (pluginId: string) => pluginService.deletePlugin(pluginId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
  });

  return {
    plugins,
    loading,
    isLoading: loading,
    isError,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['plugins'] }),
    createPlugin: createMutation.mutateAsync,
    enablePlugin: enableMutation.mutateAsync,
    disablePlugin: disableMutation.mutateAsync,
    updateConfiguration: updateConfigurationMutation.mutateAsync,
    deletePlugin: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isEnabling: enableMutation.isPending,
    isDisabling: disableMutation.isPending,
    isUpdatingConfig: updateConfigurationMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function usePluginHealth(pluginId: string | null) {
  const queryKey = queryKeys.pluginHealth(pluginId || '');

  const { data: health = null, isLoading: loading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!pluginId) return null;
      try {
        return await pluginService.checkHealth(pluginId);
      } catch (err: any) {
        return { status: 'unhealthy' as const, message: err?.message || 'Failed to check health' };
      }
    },
    enabled: !!pluginId,
  });

  return { health, loading, checkHealth: refetch };
}