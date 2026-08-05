// Test Suite service functions
import axios from 'axios';
import type { TestSuite, TestSuiteFormData } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const suiteService = {
  listSuites: async (projectId: string): Promise<TestSuite[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/suites`);
    return data.data;
  },

  getSuite: async (projectId: string, suiteId: string): Promise<TestSuite> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/suites/${suiteId}`);
    return data.data;
  },

  createSuite: async (projectId: string, payload: TestSuiteFormData): Promise<TestSuite> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/suites`, payload);
    return data.data;
  },

  updateSuite: async (projectId: string, suiteId: string, payload: Partial<TestSuiteFormData>): Promise<TestSuite> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/suites/${suiteId}`, payload);
    return data.data;
  },

  deleteSuite: async (projectId: string, suiteId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/suites/${suiteId}`);
  },

  addExecutionPlan: async (projectId: string, suiteId: string, executionPlanId: string): Promise<TestSuite> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/suites/${suiteId}/execution-plans`, { executionPlanId });
    return data.data;
  },

  removeExecutionPlan: async (projectId: string, suiteId: string, executionPlanId: string): Promise<TestSuite> => {
    const { data } = await axios.delete(`${API_BASE_URL}/projects/${projectId}/suites/${suiteId}/execution-plans/${executionPlanId}`);
    return data.data;
  },

  reorderExecutionPlans: async (projectId: string, suiteId: string, orderedPlanIds: string[]): Promise<TestSuite> => {
    const { data } = await axios.put(`${API_BASE_URL}/projects/${projectId}/suites/${suiteId}/execution-plans/reorder`, { orderedPlanIds });
    return data.data;
  },

  generateSuiteWithAI: async (projectId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/suites/generate-ai`, body);
    return data;
  },
};

export default suiteService;