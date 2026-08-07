// Knowledge service functions for the AI Knowledge Hub
import axios from 'axios';
import { apiAxios } from '../../../services/apiAxios';
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
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/flows`);
    return data.data;
  },

  getFlow: async (projectId: string, flowId: string): Promise<KnowledgeFlow> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/flows/${flowId}`);
    return data.data;
  },

  createFlow: async (projectId: string, payload: Omit<KnowledgeFlowFormData, 'id' | 'projectId'>): Promise<KnowledgeFlow> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/flows`, payload);
    return data.data;
  },

  updateFlow: async (projectId: string, flowId: string, payload: Partial<KnowledgeFlowFormData>): Promise<KnowledgeFlow> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/flows/${flowId}`, payload);
    return data.data;
  },

  deleteFlow: async (projectId: string, flowId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/flows/${flowId}`);
  },

  // Business Rules
  listBusinessRules: async (projectId: string): Promise<BusinessRule[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/rules`);
    return data.data;
  },

  getBusinessRule: async (projectId: string, ruleId: string): Promise<BusinessRule> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/rules/${ruleId}`);
    return data.data;
  },

  createBusinessRule: async (projectId: string, payload: Omit<BusinessRuleFormData, 'id' | 'projectId'>): Promise<BusinessRule> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/rules`, payload);
    return data.data;
  },

  updateBusinessRule: async (projectId: string, ruleId: string, payload: Partial<BusinessRuleFormData>): Promise<BusinessRule> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/rules/${ruleId}`, payload);
    return data.data;
  },

  deleteBusinessRule: async (projectId: string, ruleId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/rules/${ruleId}`);
  },

  // Runtime Variables
  listRuntimeVariables: async (projectId: string): Promise<RuntimeVariable[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/variables`);
    return data.data;
  },

  getRuntimeVariable: async (projectId: string, variableId: string): Promise<RuntimeVariable> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/variables/${variableId}`);
    return data.data;
  },

  createRuntimeVariable: async (projectId: string, payload: Omit<RuntimeVariableFormData, 'id' | 'projectId'>): Promise<RuntimeVariable> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/variables`, payload);
    return data.data;
  },

  updateRuntimeVariable: async (projectId: string, variableId: string, payload: Partial<RuntimeVariableFormData>): Promise<RuntimeVariable> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/variables/${variableId}`, payload);
    return data.data;
  },

  deleteRuntimeVariable: async (projectId: string, variableId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/variables/${variableId}`);
  },

  // Dependencies
  listDependencies: async (projectId: string): Promise<Dependency[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies`);
    return data.data;
  },

  getDependency: async (projectId: string, dependencyId: string): Promise<Dependency> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies/${dependencyId}`);
    return data.data;
  },

  createDependency: async (projectId: string, payload: Omit<DependencyFormData, 'id' | 'projectId'>): Promise<Dependency> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies`, payload);
    return data.data;
  },

  updateDependency: async (projectId: string, dependencyId: string, payload: Partial<DependencyFormData>): Promise<Dependency> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies/${dependencyId}`, payload);
    return data.data;
  },

  deleteDependency: async (projectId: string, dependencyId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/dependencies/${dependencyId}`);
  },

  // Documentation
  listDocumentation: async (projectId: string): Promise<Documentation[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/docs`);
    return data.data;
  },

  getDocumentation: async (projectId: string, docId: string): Promise<Documentation> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/knowledge/docs/${docId}`);
    return data.data;
  },

  createDocumentation: async (projectId: string, payload: Omit<DocumentationFormData, 'id' | 'projectId'>): Promise<Documentation> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/knowledge/docs`, payload);
    return data.data;
  },

  updateDocumentation: async (projectId: string, docId: string, payload: Partial<DocumentationFormData>): Promise<Documentation> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/knowledge/docs/${docId}`, payload);
    return data.data;
  },

  deleteDocumentation: async (projectId: string, docId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/knowledge/docs/${docId}`);
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