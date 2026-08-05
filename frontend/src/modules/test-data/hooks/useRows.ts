// TanStack Query hooks for Dataset Row management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rowService } from '../services/rowService';
import type { CreateRowInput } from '../types';
import { queryKeys } from '../../../constants';

export const useRows = (projectId?: string, datasetId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.rows(projectId || '', datasetId || '');

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId || !datasetId) return [];
      return rowService.listRows(projectId, datasetId);
    },
    enabled: !!projectId && !!datasetId,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateRowInput) => rowService.createRow(projectId || '', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ rowId, values }: { rowId: string; values: Record<string, any> }) =>
      rowService.updateRow(projectId || '', rowId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (rowId: string) => rowService.deleteRow(projectId || '', rowId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    rows,
    isLoading,
    isError,
    error,
    refetch,
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

export default useRows;