// Assertion hooks

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assertionService } from '../services';
import type { Assertion, AssertionFormData } from '../types';

export function useAssertions(projectId: string) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['assertions', projectId],
    queryFn: () => assertionService.listAssertions(projectId),
  });

  const searchQuery = useQuery({
    queryKey: ['assertions', 'search', projectId],
    queryFn: () => [],
    enabled: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: AssertionFormData) => assertionService.createAssertion(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assertions', projectId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AssertionFormData> }) =>
      assertionService.updateAssertion(projectId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assertions', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assertionService.deleteAssertion(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assertions', projectId] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      assertionService.toggleAssertion(projectId, id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assertions', projectId] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => assertionService.duplicateAssertion(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assertions', projectId] });
    },
  });

  const search = (query: string) => {
    searchQuery.refetch();
  };

  return {
    assertions: listQuery.data || [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    error: listQuery.error,
    searchResults: searchQuery.data || [],
    isSearching: searchQuery.isFetching,
    createAssertion: createMutation.mutateAsync,
    updateAssertion: updateMutation.mutateAsync,
    deleteAssertion: deleteMutation.mutateAsync,
    toggleAssertion: toggleMutation.mutateAsync,
    duplicateAssertion: duplicateMutation.mutateAsync,
    search,
    refetch: listQuery.refetch,
  };
}

export function useAssertion(projectId: string, assertionId: string) {
  return useQuery({
    queryKey: ['assertion', projectId, assertionId],
    queryFn: () => assertionService.getAssertion(projectId, assertionId),
    enabled: !!assertionId,
  });
}