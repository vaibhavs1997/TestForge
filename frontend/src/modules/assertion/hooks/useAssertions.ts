// Assertion hooks

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assertionService } from '../services';
import type { Assertion, AssertionFormData } from '../types';
import { queryKeys } from '../../../constants';

export function useAssertions(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.assertions(projectId);

  const listQuery = useQuery({
    queryKey,
    queryFn: () => assertionService.listAssertions(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (data: AssertionFormData) => assertionService.createAssertion(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssertionFormData> }) =>
      assertionService.updateAssertion(projectId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assertionService.deleteAssertion(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
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
    onError: (_err, _vars, context) => {
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
    assertions: listQuery.data || [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    createAssertion: createMutation.mutateAsync,
    updateAssertion: updateMutation.mutateAsync,
    deleteAssertion: deleteMutation.mutateAsync,
    toggleAssertion: toggleMutation.mutateAsync,
    duplicateAssertion: duplicateMutation.mutateAsync,
    refetch: listQuery.refetch,
  };
}

export function useAssertion(projectId: string, assertionId: string) {
  return useQuery({
    queryKey: queryKeys.assertion(projectId, assertionId),
    queryFn: () => assertionService.getAssertion(projectId, assertionId),
    enabled: !!assertionId,
  });
}