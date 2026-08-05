import axios from 'axios';
import type { Provider, CreateProviderInput, ProviderTestResult, AdapterInfo } from '../types/provider';
import { API_BASE_URL } from '../../../constants/api';

export const providerService = {
  listByProject: async (projectId: string, category?: string): Promise<Provider[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/providers`, {
      params: category ? { category } : undefined,
    });
    return data.data;
  },

  getById: async (projectId: string, providerId: string): Promise<Provider> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/providers/${providerId}`);
    return data.data;
  },

  create: async (projectId: string, input: CreateProviderInput): Promise<Provider> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/providers`, input);
    return data.data;
  },

  update: async (projectId: string, providerId: string, updates: Partial<CreateProviderInput>): Promise<Provider> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/providers/${providerId}`, updates);
    return data.data;
  },

  delete: async (projectId: string, providerId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/providers/${providerId}`);
  },

  testConnection: async (projectId: string, providerId: string): Promise<ProviderTestResult> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/providers/${providerId}/test`);
    return data.data;
  },

  listAdapterTypes: async (): Promise<AdapterInfo[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/adapter-types`);
    return data.data;
  },
};

export default providerService;