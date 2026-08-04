// Requirement service functions for Requirement Workspace
import axios from 'axios';
import type { Requirement, RequirementFormData, ValidationReport, TestStrategy, TestDesign, ExecutionPlan } from '../types';

const API_BASE = '/api';

export const requirementService = {
  listRequirements: async (projectId: string, approvalStatus?: string): Promise<Requirement[]> => {
    const params = approvalStatus ? { approvalStatus } : {};
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/requirements`, { params });
    return data.data;
  },

  getRequirement: async (projectId: string, requirementId: string): Promise<Requirement> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/requirements/${requirementId}`);
    return data.data;
  },

  createRequirement: async (projectId: string, payload: RequirementFormData): Promise<Requirement> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements`, payload);
    return data.data;
  },

  updateRequirement: async (projectId: string, requirementId: string, payload: Partial<RequirementFormData>): Promise<Requirement> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/requirements/${requirementId}`, payload);
    return data.data;
  },

  deleteRequirement: async (projectId: string, requirementId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/requirements/${requirementId}`);
  },

  generateFromAnalysis: async (projectId: string, analysisId: string): Promise<Requirement[]> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/from-analysis/${analysisId}`);
    return data.data;
  },

  generateWithAI: async (projectId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/generate-ai`, body);
    return data;
  },

  generateStrategyWithAI: async (projectId: string, requirementId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/${requirementId}/strategy-ai`, body);
    return data;
  },

  generateDesignWithAI: async (projectId: string, requirementId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/${requirementId}/designs-ai`, body);
    return data;
  },

  generateAssertionsWithAI: async (projectId: string, testDesignId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/test-designs/${testDesignId}/assertions-ai`, body);
    return data;
  },

  generateExecutionPlanWithAI: async (projectId: string, requirementId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/${requirementId}/execution-plans-ai`, body);
    return data;
  },

  validateReadiness: async (projectId: string, requirementId: string): Promise<ValidationReport> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/requirements/${requirementId}/validate`);
    return data.data;
  },

  planTestStrategy: async (projectId: string, requirementId: string): Promise<TestStrategy> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/${requirementId}/strategy`);
    return data.data;
  },

  generateTestDesigns: async (projectId: string, requirementId: string): Promise<TestDesign[]> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/${requirementId}/designs`);
    return data.data;
  },

  planExecution: async (projectId: string, requirementId: string): Promise<ExecutionPlan[]> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/requirements/${requirementId}/execution-plans`);
    return data.data;
  },
};

export default requirementService;