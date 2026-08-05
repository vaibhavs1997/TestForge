// TanStack Query hooks for Dataset Columns
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { columnService } from '../services/columnService';
import type { ColumnDto, ColumnSuggestion } from '../services/columnService';
import { queryKeys } from '../../../constants';

// ─── Columns ───────────────────────────────────────────────────

export const useColumns = (projectId?: string, datasetId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.columns(projectId || '', datasetId || '');

  const { data: columns = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const result = await columnService.listColumns(projectId, datasetId);
      return result;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string; datasetId: string; name: string; displayName: string; dataType: string; required: boolean; unique: boolean; nullable: boolean; description?: string }) =>
      columnService.createColumn(data.projectId, {
        datasetId: data.datasetId,
        name: data.name,
        displayName: data.displayName,
        dataType: data.dataType,
        required: data.required,
        unique: data.unique,
        nullable: data.nullable,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ columnId, ...data }: { columnId: string } & { name?: string; displayName?: string; dataType?: string; required?: boolean; unique?: boolean; nullable?: boolean; description?: string }) =>
      columnService.updateColumn(projectId || '', columnId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (columnId: string) => columnService.deleteColumn(projectId || '', columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    columns,
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