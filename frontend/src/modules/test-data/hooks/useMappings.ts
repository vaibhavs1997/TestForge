// TanStack Query hooks for Data Source Mappings
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mappingService } from '../services/mappingService';
import type { DataSourceMappingDto } from '../services/mappingService';
import { queryKeys } from '../../../constants';

// ─── Mappings ──────────────────────────────────────────────────

export const useMappings = (projectId?: string, operationId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.mappings(projectId || '', operationId);

  const { data: mappings = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const result = await mappingService.listMappings(projectId, operationId);
      return result;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string; serviceId: string; operationId: string; fieldPath: string; sourceType: string; [key: string]: any }) =>
      mappingService.createMapping(data.projectId, {
        serviceId: data.serviceId,
        operationId: data.operationId,
        fieldPath: data.fieldPath,
        sourceType: data.sourceType,
        datasetId: data.datasetId,
        datasetColumn: data.datasetColumn,
        environmentVariable: data.environmentVariable,
        runtimeOperationId: data.runtimeOperationId,
        runtimeField: data.runtimeField,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ mappingId, ...data }: { mappingId: string } & { fieldPath?: string; sourceType?: string; datasetId?: string; datasetColumn?: string; environmentVariable?: string; runtimeOperationId?: string; runtimeField?: string; notes?: string }) =>
      mappingService.updateMapping(projectId || '', mappingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mappingId: string) => mappingService.deleteMapping(projectId || '', mappingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    mappings,
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

export default useMappings;