import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Generic CRUD service interface that all CRUD services should implement
 */
export interface CRUDService<T, CreateInput = any, UpdateInput = any> {
  list: () => Promise<T[]>;
  get?: (id: string) => Promise<T>;
  create: (input: CreateInput) => Promise<T>;
  update: (id: string, input: UpdateInput) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

/**
 * Options for configuring the useCRUD hook
 */
export interface UseCRUDOptions<T, CreateInput = any, UpdateInput = any> {
  queryKey: readonly string[];
  service: CRUDService<T, CreateInput, UpdateInput>;
  enabled?: boolean;
  listOptions?: Omit<UseQueryOptions<T[]>, 'queryKey' | 'queryFn'>;
  createOptions?: Omit<UseMutationOptions<T, unknown, CreateInput>, 'mutationFn'>;
  updateOptions?: Omit<UseMutationOptions<T, unknown, { id: string; data: UpdateInput }>, 'mutationFn'>;
  deleteOptions?: Omit<UseMutationOptions<void, unknown, string>, 'mutationFn'>;
  onMutateSuccess?: () => void;
}

/**
 * Return type of the useCRUD hook
 */
export interface UseCRUDReturn<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => any;
  create: (input: any) => Promise<any>;
  update: (id: string, input: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

/**
 * Generic CRUD hook factory that encapsulates common React Query patterns
 * Eliminates boilerplate across useDatasets, useColumns, useRows, useEnvironments, etc.
 *
 * @example
 * const { data, create, update, remove, isLoading, isError } = useCRUD({
 *   queryKey: queryKeys.datasets(projectId),
 *   service: datasetService,
 *   enabled: !!projectId,
 * });
 */
export function useCRUD<T, CreateInput = any, UpdateInput = any>(
  options: UseCRUDOptions<T, CreateInput, UpdateInput>
): UseCRUDReturn<T> {
  const queryClient = useQueryClient();
  const { 
    queryKey, 
    service, 
    enabled = true, 
    listOptions = {},
    createOptions = {},
    updateOptions = {},
    deleteOptions = {},
    onMutateSuccess,
  } = options;

  // List query
  const listQuery = useQuery({
    queryKey: [...queryKey] as any[],
    queryFn: () => service.list(),
    enabled,
    ...listOptions,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateInput) => service.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey as any[] });
      onMutateSuccess?.();
    },
    ...createOptions,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInput }) => 
      service.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey as any[] });
      onMutateSuccess?.();
    },
    ...updateOptions,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => service.delete(id),
    onSuccess: async (_data, deletedId) => {
      queryClient.setQueryData<T[]>(queryKey as any[], (current) =>
        (current ?? []).filter((item) => (item as { id?: string }).id !== deletedId),
      );
      await queryClient.refetchQueries({ queryKey: queryKey as any[] });
      onMutateSuccess?.();
    },
    ...deleteOptions,
  });

  // Wrapper to convert the update mutation interface to a simpler one
  const updateWrapper = async (id: string, data: any) => {
    return updateMutation.mutateAsync({ id, data });
  };

  return {
    data: listQuery.data || [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    refetch: listQuery.refetch,
    create: createMutation.mutateAsync,
    update: updateWrapper,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useCRUD;
