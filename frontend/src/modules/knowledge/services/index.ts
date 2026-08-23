// Knowledge service functions for the AI Knowledge Hub
import apiAxios from '../../../services/apiAxios';
import type {
  BusinessRuleDto,
  DependencyDto,
  DocumentationDto,
  KnowledgeFlowDto,
  RuntimeVariableDto,
} from '../../../types/moduleContracts';
import {
  normalizeBusinessRule,
  normalizeDependency,
  normalizeDocumentation,
  normalizeKnowledgeFlow,
  normalizeRuntimeVariable,
} from '../../../utils/moduleAdapters';
import type {
  KnowledgeFlow,
  KnowledgeFlowFormData,
  BusinessRule,
  BusinessRuleFormData,
  RuntimeVariable,
  RuntimeVariableFormData,
  Dependency,
  DependencyFormData,
  Documentation,
  DocumentationFormData,
} from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const knowledgeService = {
  // Business Flows
  listFlows: async (projectId: string): Promise<KnowledgeFlow[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/flows`);
    return (data.data as KnowledgeFlowDto[]).map(normalizeKnowledgeFlow);
  },

  getFlow: async (projectId: string, flowId: string): Promise<KnowledgeFlow> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/flows/${flowId}`);
    return normalizeKnowledgeFlow(data.data as KnowledgeFlowDto);
  },

  createFlow: async (projectId: string, payload: Omit<KnowledgeFlowFormData, 'id' | 'projectId'>): Promise<KnowledgeFlow> => {
    const { data } = await apiAxios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/flows`, payload);
    return normalizeKnowledgeFlow(data.data as KnowledgeFlowDto);
  },

  updateFlow: async (projectId: string, flowId: string, payload: Partial<KnowledgeFlowFormData>): Promise<KnowledgeFlow> => {
    const { data } = await apiAxios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/flows/${flowId}`, payload);
    return normalizeKnowledgeFlow(data.data as KnowledgeFlowDto);
  },

  deleteFlow: async (projectId: string, flowId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/flows/${flowId}`);
  },

  // Business Rules
  listBusinessRules: async (projectId: string): Promise<BusinessRule[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/rules`);
    return (data.data as BusinessRuleDto[]).map(normalizeBusinessRule);
  },

  getBusinessRule: async (projectId: string, ruleId: string): Promise<BusinessRule> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/rules/${ruleId}`);
    return normalizeBusinessRule(data.data as BusinessRuleDto);
  },

  createBusinessRule: async (projectId: string, payload: Omit<BusinessRuleFormData, 'id' | 'projectId'>): Promise<BusinessRule> => {
    const { data } = await apiAxios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/rules`, payload);
    return normalizeBusinessRule(data.data as BusinessRuleDto);
  },

  updateBusinessRule: async (projectId: string, ruleId: string, payload: Partial<BusinessRuleFormData>): Promise<BusinessRule> => {
    const { data } = await apiAxios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/rules/${ruleId}`, payload);
    return normalizeBusinessRule(data.data as BusinessRuleDto);
  },

  deleteBusinessRule: async (projectId: string, ruleId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/rules/${ruleId}`);
  },

  // Runtime Variables
  listRuntimeVariables: async (projectId: string): Promise<RuntimeVariable[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/variables`);
    return (data.data as RuntimeVariableDto[]).map(normalizeRuntimeVariable);
  },

  getRuntimeVariable: async (projectId: string, variableId: string): Promise<RuntimeVariable> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/variables/${variableId}`);
    return normalizeRuntimeVariable(data.data as RuntimeVariableDto);
  },

  createRuntimeVariable: async (projectId: string, payload: Omit<RuntimeVariableFormData, 'id' | 'projectId'>): Promise<RuntimeVariable> => {
    const { data } = await apiAxios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/variables`, payload);
    return normalizeRuntimeVariable(data.data as RuntimeVariableDto);
  },

  updateRuntimeVariable: async (projectId: string, variableId: string, payload: Partial<RuntimeVariableFormData>): Promise<RuntimeVariable> => {
    const { data } = await apiAxios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/variables/${variableId}`, payload);
    return normalizeRuntimeVariable(data.data as RuntimeVariableDto);
  },

  deleteRuntimeVariable: async (projectId: string, variableId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/variables/${variableId}`);
  },

  // Dependencies
  listDependencies: async (projectId: string): Promise<Dependency[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies`);
    return (data.data as DependencyDto[]).map(normalizeDependency);
  },

  getDependency: async (projectId: string, dependencyId: string): Promise<Dependency> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies/${dependencyId}`);
    return normalizeDependency(data.data as DependencyDto);
  },

  createDependency: async (projectId: string, payload: Omit<DependencyFormData, 'id' | 'projectId'>): Promise<Dependency> => {
    const { data } = await apiAxios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies`, payload);
    return normalizeDependency(data.data as DependencyDto);
  },

  updateDependency: async (projectId: string, dependencyId: string, payload: Partial<DependencyFormData>): Promise<Dependency> => {
    const { data } = await apiAxios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies/${dependencyId}`, payload);
    return normalizeDependency(data.data as DependencyDto);
  },

  deleteDependency: async (projectId: string, dependencyId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies/${dependencyId}`);
  },

  // Documentation
  listDocumentation: async (projectId: string): Promise<Documentation[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/docs`);
    return (data.data as DocumentationDto[]).map(normalizeDocumentation);
  },

  getDocumentation: async (projectId: string, docId: string): Promise<Documentation> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/docs/${docId}`);
    return normalizeDocumentation(data.data as DocumentationDto);
  },

  createDocumentation: async (projectId: string, payload: Omit<DocumentationFormData, 'id' | 'projectId'>): Promise<Documentation> => {
    const { data } = await apiAxios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/docs`, payload);
    return normalizeDocumentation(data.data as DocumentationDto);
  },

  updateDocumentation: async (projectId: string, docId: string, payload: Partial<DocumentationFormData>): Promise<Documentation> => {
    const { data } = await apiAxios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/docs/${docId}`, payload);
    return normalizeDocumentation(data.data as DocumentationDto);
  },

  deleteDocumentation: async (projectId: string, docId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/docs/${docId}`);
  },

  importDocuments: async (
    projectId: string,
    files: File[]
  ): Promise<{
    created: { flows: number; rules: number; variables: number; dependencies: number; documentation: number };
    errors: string[];
    filesProcessed: number;
  }> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const { data } = await apiAxios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
};

export default knowledgeService;
