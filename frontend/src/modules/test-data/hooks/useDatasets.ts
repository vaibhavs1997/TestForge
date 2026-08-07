// TanStack Query hooks for Test Data Library
import { useCRUD } from '../../../hooks/useCRUD';
import { datasetService } from '../services/datasetService';
import type { DatasetDto } from '../services/datasetService';
import { queryKeys } from '../../../constants';

// ─── Datasets ──────────────────────────────────────────────────

export const useDatasets = (projectId?: string) => {
  const { data, isLoading, isError, error, create, update, remove, isCreating, isUpdating, isDeleting } = useCRUD({
    queryKey: queryKeys.datasets(projectId || ''),
    service: {
      list: () => (projectId ? datasetService.listDatasets(projectId) : Promise.resolve([])),
      create: (input: { projectId: string; name: string; description?: string; category?: string }) =>
        datasetService.createDataset(input.projectId, {
          name: input.name,
          description: input.description,
          category: input.category,
        }),
      update: (datasetId: string, input: { name?: string; description?: string; category?: string }) =>
        datasetService.updateDataset(projectId || '', datasetId, input),
      delete: (datasetId: string) => datasetService.deleteDataset(projectId || '', datasetId),
    },
    enabled: !!projectId,
  });

  return {
    datasets: data,
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

export default useDatasets;