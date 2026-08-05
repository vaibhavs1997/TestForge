// Prompt Builder hooks - migrated to TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promptService } from '../services';
import type { PromptTemplate, Prompt, BuiltPrompt, BuildPromptRequest, PreviewPromptRequest } from '../types';
import { queryKeys } from '../../../constants';

export function useTemplates(projectId: string | null) {
  const queryKey = queryKeys.promptTemplates(projectId || '');

  const { data: templates = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return promptService.listTemplates(projectId);
    },
    enabled: !!projectId,
  });

  return { templates, loading, isLoading: loading, isError, error, refetch };
}

export function usePrompts(projectId: string | null) {
  const queryKey = queryKeys.prompts(projectId || '');

  const { data: prompts = [], isLoading: loading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return promptService.listPrompts(projectId);
    },
    enabled: !!projectId,
  });

  return { prompts, loading, isLoading: loading, isError, error, refetch };
}

export function usePromptBuilder(projectId: string | null) {
  const queryClient = useQueryClient();
  const promptsKey = queryKeys.prompts(projectId || '');

  const previewMutation = useMutation({
    mutationFn: (request: PreviewPromptRequest) => {
      if (!projectId) throw new Error('Missing projectId');
      return promptService.previewPrompt(projectId, request);
    },
  });

  const buildMutation = useMutation({
    mutationFn: (request: BuildPromptRequest) => {
      if (!projectId) throw new Error('Missing projectId');
      return promptService.buildPrompt(projectId, request);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promptsKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ promptId }: { promptId: string }) => {
      if (!projectId) throw new Error('Missing projectId');
      return promptService.deletePrompt(projectId, promptId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: promptsKey }),
  });

  return {
    preview: previewMutation.data ?? null,
    building: previewMutation.isPending || buildMutation.isPending,
    buildError: previewMutation.error
      ? (previewMutation.error as Error).message
      : buildMutation.error
      ? (buildMutation.error as Error).message
      : null,
    previewPrompt: previewMutation.mutate,
    buildPrompt: buildMutation.mutateAsync,
    deletePrompt: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}