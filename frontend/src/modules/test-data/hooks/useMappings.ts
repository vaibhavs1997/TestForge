// TanStack Query hooks for Data Source Mappings
import { useCRUD } from '../../../hooks/useCRUD';
import { mappingService } from '../services/mappingService';
import type { DataSourceMappingDto } from '../../../types/moduleContracts';
import { queryKeys } from '../../../constants';

// ─── Mappings ──────────────────────────────────────────────────

export const useMappings = (projectId?: string, operationId?: string) => {
  const { data, isLoading, isError, error, create, update, remove, isCreating, isUpdating, isDeleting } = useCRUD({
    queryKey: [...queryKeys.mappings(projectId || '', operationId)] as string[],
    service: {
      list: () => (projectId ? mappingService.listMappings(projectId, operationId) : Promise.resolve([])),
      create: (input: { projectId: string; serviceId: string; operationId: string; fieldPath: string; sourceType: string; [key: string]: any }) =>
        mappingService.createMapping(input.projectId, {
          serviceId: input.serviceId,
          operationId: input.operationId,
          fieldPath: input.fieldPath,
          sourceType: input.sourceType,
          datasetId: input.datasetId,
          datasetColumn: input.datasetColumn,
          environmentVariable: input.environmentVariable,
          runtimeOperationId: input.runtimeOperationId,
          runtimeField: input.runtimeField,
          notes: input.notes,
        }),
      update: (mappingId: string, input: { fieldPath?: string; sourceType?: string; datasetId?: string; datasetColumn?: string; environmentVariable?: string; runtimeOperationId?: string; runtimeField?: string; notes?: string }) =>
        mappingService.updateMapping(projectId || '', mappingId, input),
      delete: (mappingId: string) => mappingService.deleteMapping(projectId || '', mappingId),
    },
    enabled: !!projectId,
  });

  return {
    mappings: data,
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

export default useMappings;
