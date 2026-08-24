// Assertion hooks

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { assertionService } from '../services';
import type { Assertion, AssertionFormData } from '../types';
import { queryKeys } from '../../../constants';

export function useAssertions(projectId?: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.assertions(projectId ?? '');

  const { data, isLoading, isError, error, create, update, remove, refetch } = useCRUD({
    queryKey,
    service: {
      list: () => projectId ? assertionService.listAssertions(projectId) : Promise.resolve([]),
      create: (data: AssertionFormData) => projectId ? assertionService.createAssertion(projectId, data) : Promise.reject(new Error('Project context is required')),
      update: (id: string, data: Partial<AssertionFormData>) => projectId ? assertionService.updateAssertion(projectId, id, data) : Promise.reject(new Error('Project context is required')),
      delete: (id: string) => projectId ? assertionService.deleteAssertion(projectId, id) : Promise.reject(new Error('Project context is required')),
    },
    enabled: !!projectId,
  });

  // Optimistic toggle (safe, non-destructive)
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      projectId ? assertionService.toggleAssertion(projectId, id, enabled) : Promise.reject(new Error('Project context is required')),
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Assertion[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Assertion[]>(queryKey, (old) =>
          (old || []).map((a) => (a.id === id ? { ...a, enabled } : a))
        );
      }
      return { previous };
    },
    onError: (_err: any, _vars: any, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => projectId ? assertionService.duplicateAssertion(projectId, id) : Promise.reject(new Error('Project context is required')),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    assertions: data,
    isLoading,
    isError,
    error,
    createAssertion: create,
    updateAssertion: update,
    deleteAssertion: remove,
    toggleAssertion: toggleMutation.mutateAsync,
    duplicateAssertion: duplicateMutation.mutateAsync,
    refetch,
  };
}

export function useAssertion(projectId: string, assertionId: string) {
  return useCRUD({
    queryKey: queryKeys.assertion(projectId, assertionId),
    service: {
      list: () => assertionService.getAssertion(projectId, assertionId).then(a => [a]),
      create: () => Promise.resolve({} as any),
      update: () => Promise.resolve({} as any),
      delete: () => Promise.resolve(),
    },
    enabled: !!assertionId,
  }).data[0] || null;
}
