// TanStack Query hooks for Dataset Row management
import { useCRUD } from '../../../hooks/useCRUD';
import { rowService } from '../services/rowService';
import type { CreateRowInput } from '../types';
import { queryKeys } from '../../../constants';

export const useRows = (projectId?: string, datasetId?: string) => {
  const { data, isLoading, isError, error, refetch, create, update, remove, isCreating, isUpdating, isDeleting } = useCRUD({
    queryKey: queryKeys.rows(projectId || '', datasetId || ''),
    service: {
      list: () => (projectId && datasetId ? rowService.listRows(projectId, datasetId) : Promise.resolve([])),
      create: (input: CreateRowInput) => rowService.createRow(projectId || '', input),
      update: (rowId: string, values: Record<string, any>) => rowService.updateRow(projectId || '', rowId, values),
      delete: (rowId: string) => rowService.deleteRow(projectId || '', rowId),
    },
    enabled: !!projectId && !!datasetId,
  });

  return {
    rows: data,
    isLoading,
    isError,
    error,
    refetch,
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

export default useRows;