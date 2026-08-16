// TanStack Query hooks for Dataset Columns
import { useQuery } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { columnService } from '../services/columnService';
import type { ColumnSuggestion } from '../services/columnService';
import type { ColumnDto } from '../../../types/moduleContracts';
import { queryKeys } from '../../../constants';

// ─── Columns ───────────────────────────────────────────────────

export const useColumns = (projectId?: string, datasetId?: string) => {
  const { data, isLoading, isError, error, create, update, remove, isCreating, isUpdating, isDeleting } = useCRUD({
    queryKey: queryKeys.columns(projectId || '', datasetId || ''),
    service: {
      list: () => (projectId ? columnService.listColumns(projectId, datasetId) : Promise.resolve([])),
      create: (input: { projectId: string; datasetId: string; name: string; displayName: string; dataType: string; required: boolean; unique: boolean; nullable: boolean; description?: string }) =>
        columnService.createColumn(input.projectId, {
          datasetId: input.datasetId,
          name: input.name,
          displayName: input.displayName,
          dataType: input.dataType,
          required: input.required,
          unique: input.unique,
          nullable: input.nullable,
          description: input.description,
        }),
      update: (columnId: string, input: { name?: string; displayName?: string; dataType?: string; required?: boolean; unique?: boolean; nullable?: boolean; description?: string }) =>
        columnService.updateColumn(projectId || '', columnId, input),
      delete: (columnId: string) => columnService.deleteColumn(projectId || '', columnId),
    },
    enabled: !!projectId,
  });

  return {
    columns: data,
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

// ─── Column Suggestions ────────────────────────────────────────

export const useColumnSuggestions = (projectId?: string, datasetName?: string) => {
  const queryKey = queryKeys.columnSuggestions(projectId || '', datasetName || '');

  const { data: suggestions = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId || !datasetName) return [];
      const result = await columnService.suggestColumns(projectId, datasetName);
      return result.suggestions;
    },
    enabled: !!projectId && !!datasetName,
  });

  return {
    suggestions,
    isLoading,
    isError,
    error,
  };
};

export default useColumns;
