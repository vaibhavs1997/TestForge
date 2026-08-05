// Assertion hooks

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCRUD } from '../../../hooks/useCRUD';
import { assertionService } from '../services';
import type { Assertion, AssertionFormData } from '../types';
import { queryKeys } from '../../../constants';

export function useAssertions(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.assertions(projectId);

  const { data, isLoading, isError, error, create, update, remove, refetch } = useCRUD({
    queryKey,
    service: {
      list: () => assertionService.listAssertions(projectId),
      create: (data: AssertionFormData) => assertionService.createAssertion(projectId, data),
      update: (id: string, data: Partial<AssertionFormData>) => assertionService.updateAssertion(projectId, id, data),
      delete: (id: string) => assertionService.deleteAssertion(projectId, id),
    },
  });

  // Optimistic toggle (safe, non-destructive)
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      assertionService.toggleAssertion(projectId, id, enabled),
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
    mutationFn: (id: string) => assertionService.duplicateAssertion(projectId, id),
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