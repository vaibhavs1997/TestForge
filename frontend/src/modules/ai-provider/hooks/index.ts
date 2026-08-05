// AI Provider hooks - migrated to TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiProviderService } from '../services';
import type {
  AIProvider,
  AIProviderType,
  AIProviderHealth,
  AIProviderEstimate,
  AIProviderMessage,
  AIProviderGenerateResult,
  AIProviderAdapterInfo,
} from '../types';
import { queryKeys } from '../../../constants';

const FALLBACK_TYPES: AIProviderType[] = ['OpenAI', 'Claude', 'Gemini', 'Ollama', 'Azure OpenAI', 'AWS Bedrock', 'Custom'];
const FALLBACK_ADAPTERS: AIProviderAdapterInfo[] = [
  { type: 'OpenAI', category: 'OpenAI' },
  { type: 'Claude', category: 'Claude' },
  { type: 'Gemini', category: 'Gemini' },
  { type: 'Ollama', category: 'Ollama' },
  { type: 'Azure OpenAI', category: 'Azure OpenAI' },
  { type: 'AWS Bedrock', category: 'AWS Bedrock' },
  { type: 'Custom', category: 'Custom' },
];

export function useAIProviders(projectId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.aiProviders(projectId || '');

  const { data: providers = [], isLoading: loading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return aiProviderService.listProviders(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof aiProviderService.createProvider>[1] & { projectId: string }) =>
      aiProviderService.createProvider(payload.projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ projectId, providerId, updates }: { projectId: string; providerId: string; updates: Parameters<typeof aiProviderService.updateProvider>[2] }) =>
      aiProviderService.updateProvider(projectId, providerId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ projectId, providerId }: { projectId: string; providerId: string }) =>
      aiProviderService.deleteProvider(projectId, providerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Optimistic enable (safe, non-destructive)
  const enableMutation = useMutation({
    mutationFn: ({ projectId, providerId }: { projectId: string; providerId: string }) =>
      aiProviderService.enableProvider(projectId, providerId),
    onMutate: async ({ providerId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AIProvider[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<AIProvider[]>(queryKey, (old) =>
          (old || []).map((p) => (p.id === providerId ? { ...p, enabled: true } : p))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Optimistic disable (safe, non-destructive)
  const disableMutation = useMutation({
    mutationFn: ({ projectId, providerId }: { projectId: string; providerId: string }) =>
      aiProviderService.disableProvider(projectId, providerId),
    onMutate: async ({ providerId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<AIProvider[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<AIProvider[]>(queryKey, (old) =>
          (old || []).map((p) => (p.id === providerId ? { ...p, enabled: false } : p))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: ({ projectId, providerId }: { projectId: string; providerId: string }) =>
      aiProviderService.setDefaultProvider(projectId, providerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    providers,
    loading,
    isLoading: loading,
    isError,
    error,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
    createProvider: createMutation.mutateAsync,
    updateProvider: updateMutation.mutateAsync,
    deleteProvider: deleteMutation.mutateAsync,
    enableProvider: enableMutation.mutateAsync,
    disableProvider: disableMutation.mutateAsync,
    setDefaultProvider: setDefaultMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useAIProviderTypes() {
  const { data: types = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.aiProviderTypes(),
    queryFn: async () => {
      try {
        return await aiProviderService.listSupportedTypes();
      } catch {
        return FALLBACK_TYPES;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  return { types, loading, refetch: () => {} };
}

export function useAIProviderAdapters() {
  const { data: adapters = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.aiProviderAdapters(),
    queryFn: async () => {
      try {
        return await aiProviderService.listAdapters();
      } catch {
        return FALLBACK_ADAPTERS;
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  return { adapters, loading, refetch: () => {} };
}

export function useAIProviderHealth(projectId: string | null, providerId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.aiProviderHealth(projectId || '', providerId || '');

  const checkHealthMutation = useMutation({
    mutationFn: () => {
      if (!projectId || !providerId) throw new Error('Missing projectId or providerId');
      return aiProviderService.testProvider(projectId, providerId);
    },
    onError: (err: any) => {
      queryClient.setQueryData<AIProviderHealth>(queryKey, {
        healthy: false,
        message: err?.message || 'Failed to test connection',
      });
    },
  });

  return {
    health: checkHealthMutation.data ?? null,
    loading: checkHealthMutation.isPending,
    checkHealth: checkHealthMutation.mutate,
  };
}

export function useAIProviderEstimate(projectId: string | null, providerId: string | null) {
  const estimateMutation = useMutation({
    mutationFn: ({ messages, maxTokens }: { messages: AIProviderMessage[]; maxTokens?: number }) => {
      if (!projectId || !providerId) throw new Error('Missing projectId or providerId');
      return aiProviderService.estimateProvider(projectId, providerId, messages, maxTokens);
    },
  });

  return {
    estimate: estimateMutation.data ?? null,
    loading: estimateMutation.isPending,
    estimateProvider: estimateMutation.mutate,
  };
}

export function useAIProviderGenerate(projectId: string | null, providerId: string | null) {
  const generateMutation = useMutation({
    mutationFn: ({
      messages,
      options,
    }: {
      messages: AIProviderMessage[];
      options?: { maxTokens?: number; temperature?: number; topP?: number; stop?: string[] };
    }) => {
      if (!projectId || !providerId) throw new Error('Missing projectId or providerId');
      return aiProviderService.generateProvider(projectId, providerId, messages, options);
    },
  });

  return {
    result: generateMutation.data ?? null,
    loading: generateMutation.isPending,
    error: generateMutation.error ? (generateMutation.error as Error).message : null,
    generate: generateMutation.mutate,
  };
}