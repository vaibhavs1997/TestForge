// TanStack Query hooks for API services and operations.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { apiService } from '../services/apiService';
import type { ServiceFormData, OperationFormData, ImportSummary } from '../types';
import type { AxiosProgressEvent } from 'axios';
import { queryKeys } from '../../../constants';
import { notificationInboxQueryKey } from '../../notification/hooks';
import { toApiOperationView } from '../../../types/apiModels';

// ─── Services ────────────────────────────────────────────────

export const useServices = (projectId?: string) => {
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    isError,
    error,
    create,
    update,
    remove,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCRUD({
    queryKey: queryKeys.services(projectId || ''),
    service: {
      list: () => (projectId ? apiService.listServices(projectId) : Promise.resolve([])),
      create: (data: ServiceFormData) =>
        apiService.createService(data.projectId, {
          name: data.name,
          description: data.description,
          version: data.version,
          tags: data.tags,
        }),
      update: (id: string, data: ServiceFormData) =>
        apiService.updateService(data.projectId, id, {
          name: data.name,
          description: data.description,
          version: data.version,
          tags: data.tags,
        }),
      delete: (id: string) => apiService.deleteService(projectId || '', id),
    },
    enabled: !!projectId,
    onMutateSuccess: () => {
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) });
      }
    },
  });

  return {
    services: data,
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
    refetch,
  };
};

export const useService = (projectId?: string) => {
  const services = useServices(projectId);
  return {
    services: services.services,
    allServices: services.services,
    isLoading: services.isLoading,
    isError: services.isError,
    create: services.create,
    createAsync: services.createAsync,
    update: services.update,
    updateAsync: services.updateAsync,
    remove: services.remove,
    removeAsync: services.removeAsync,
    refetchServices: services.refetch,
  };
};

// ─── Operations ──────────────────────────────────────────────

export const useApiOperations = (projectId?: string, serviceIds?: string[]) => {
  const queryClient = useQueryClient();
  const servicesQueryKey = queryKeys.services(projectId || '');
  const queryKey = queryKeys.operations(projectId || '');

  const { data: operations, isLoading, isError, error } = useCRUD({
    queryKey,
    service: {
      list: async () => {
        if (!projectId || !serviceIds || serviceIds.length === 0) return [];
        const results = await Promise.all(
          serviceIds.map(async (sid) => {
            const service = await apiService.getService(projectId, sid).catch(() => null);
            const ops = await apiService.listOperations(projectId, sid).catch(() => []);
            return ops.map((op) => toApiOperationView(op, service?.name));
          }),
        );
        return results.flat();
      },
      create: () => Promise.resolve({} as any),
      update: () => Promise.resolve({} as any),
      delete: () => Promise.resolve(),
    },
    enabled: !!(projectId && serviceIds && serviceIds.length > 0),
    listOptions: {
      staleTime: 30_000,
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: { serviceId: string } & OperationFormData) =>
      apiService.createOperation(projectId || '', payload.serviceId, {
        name: payload.name,
        method: payload.method,
        path: payload.path,
        description: payload.description,
        authenticationType: payload.authenticationType,
        status: payload.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: servicesQueryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ apiId, serviceId, ...data }: { apiId: string; serviceId: string } & OperationFormData) =>
      apiService.updateOperation(projectId || '', serviceId, apiId, {
        name: data.name,
        method: data.method,
        path: data.path,
        description: data.description,
        authenticationType: data.authenticationType,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ apiId, serviceId }: { apiId: string; serviceId: string }) =>
      apiService.deleteOperation(projectId || '', serviceId, apiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    operations,
    isLoading,
    isError,
    error,
    createOperation: createMutation.mutate,
    createOperationAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateOperation: updateMutation.mutate,
    updateOperationAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteOperation: deleteMutation.mutate,
    deleteOperationAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

// ─── Import Contract ─────────────────────────────────────────

export const useImportApiContract = (projectId?: string) => {
  const queryClient = useQueryClient();
  const servicesQueryKey = queryKeys.services(projectId || '');
  const operationsQueryKey = queryKeys.operations(projectId || '');

  const importMutation = useMutation({
    mutationFn: (
      input:
        | {
            file: File;
            onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
          }
        | { url: string },
    ) => {
      if ('url' in input) {
        return apiService.importContractFromUrl(projectId || '', input.url);
      }
      return apiService.importContract(projectId || '', input.file, input.onUploadProgress);
    },
    onSuccess: () => {
      // Refresh services tree and operations after a successful import.
      queryClient.invalidateQueries({ queryKey: servicesQueryKey });
      queryClient.invalidateQueries({ queryKey: operationsQueryKey });
      queryClient.invalidateQueries({ queryKey: notificationInboxQueryKey() });
    },
  });

  return {
    importContract: importMutation.mutate,
    importContractAsync: importMutation.mutateAsync,
    isImporting: importMutation.isPending,
  };
};

export default useService;
