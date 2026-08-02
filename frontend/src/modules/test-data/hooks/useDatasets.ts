// TanStack Query hooks for Test Data Library
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { datasetService } from '../services/datasetService';
import type { DatasetDto } from '../services/datasetService';

// ─── Datasets ──────────────────────────────────────────────────

export const useDatasets = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['datasets', projectId];

  const { data: datasets = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const result = await datasetService.listDatasets(projectId);
      return result;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string; name: string; description?: string; category?: string }) =>
      datasetService.createDataset(data.projectId, {
        name: data.name,
        description: data.description,
        category: data.category,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ datasetId, ...data }: { datasetId: string } & { name?: string; description?: string; category?: string }) =>
      datasetService.updateDataset(projectId || '', datasetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (datasetId: string) => datasetService.deleteDataset(projectId || '', datasetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    datasets,
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

export default useDatasets;