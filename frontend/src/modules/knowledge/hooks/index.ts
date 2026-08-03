// TanStack Query hooks for Knowledge Hub
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { knowledgeService } from '../services';
import type {
  KnowledgeFlowFormData,
  BusinessRuleFormData,
  RuntimeVariableFormData,
  DependencyFormData,
  DocumentationFormData,
} from '../types';

// Knowledge Flows hooks
export const useKnowledgeFlows = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['knowledge-flows', projectId];

  const { data: flows = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return knowledgeService.listFlows(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<KnowledgeFlowFormData, 'id' | 'projectId'>) =>
      knowledgeService.createFlow(projectId || '', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ flowId, ...data }: { flowId: string } & Partial<KnowledgeFlowFormData>) =>
      knowledgeService.updateFlow(projectId || '', flowId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (flowId: string) => knowledgeService.deleteFlow(projectId || '', flowId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    flows,
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

// Business Rules hooks
export const useBusinessRules = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['business-rules', projectId];

  const { data: rules = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return knowledgeService.listBusinessRules(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<BusinessRuleFormData, 'id' | 'projectId'>) =>
      knowledgeService.createBusinessRule(projectId || '', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ ruleId, ...data }: { ruleId: string } & Partial<BusinessRuleFormData>) =>
      knowledgeService.updateBusinessRule(projectId || '', ruleId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => knowledgeService.deleteBusinessRule(projectId || '', ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    rules,
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

// Runtime Variables hooks
export const useRuntimeVariables = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['runtime-variables', projectId];

  const { data: variables = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return knowledgeService.listRuntimeVariables(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<RuntimeVariableFormData, 'id' | 'projectId'>) =>
      knowledgeService.createRuntimeVariable(projectId || '', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ variableId, ...data }: { variableId: string } & Partial<RuntimeVariableFormData>) =>
      knowledgeService.updateRuntimeVariable(projectId || '', variableId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (variableId: string) => knowledgeService.deleteRuntimeVariable(projectId || '', variableId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    variables,
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

// Dependencies hooks
export const useDependencies = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['dependencies', projectId];

  const { data: dependencies = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return knowledgeService.listDependencies(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<DependencyFormData, 'id' | 'projectId'>) =>
      knowledgeService.createDependency(projectId || '', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ dependencyId, ...data }: { dependencyId: string } & Partial<DependencyFormData>) =>
      knowledgeService.updateDependency(projectId || '', dependencyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (dependencyId: string) => knowledgeService.deleteDependency(projectId || '', dependencyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    dependencies,
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

// Documentation hooks
export const useDocumentation = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ['documentation', projectId];

  const { data: docs = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return knowledgeService.listDocumentation(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<DocumentationFormData, 'id' | 'projectId'>) =>
      knowledgeService.createDocumentation(projectId || '', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ docId, ...data }: { docId: string } & Partial<DocumentationFormData>) =>
      knowledgeService.updateDocumentation(projectId || '', docId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => knowledgeService.deleteDocumentation(projectId || '', docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    docs,
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

export default useKnowledgeFlows;