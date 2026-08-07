// AI Provider service functions
import { apiAxios } from '../../../services/apiAxios';
import type {
  AIProvider,
  AIProviderType,
  AIProviderHealth,
  AIProviderEstimate,
  AIProviderMessage,
  AIProviderGenerateResult,
  AIProviderAdapterInfo,
} from '../types';
import { API_BASE_URL } from '../../../constants/api';

const http = apiAxios;

export const aiProviderService = {
  listProviders: async (projectId: string): Promise<AIProvider[]> => {
    const { data } = await http.get(`${API_BASE_URL}/projects/${projectId}/ai/providers`);
    return data.data;
  },

  getProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await http.get(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}`);
    return data.data;
  },

  createProvider: async (
    projectId: string,
    provider: {
      name: string;
      provider: AIProviderType;
      model: string;
      endpoint?: string;
      apiKey?: string;
      organization?: string;
      temperature?: number;
      topP?: number;
      maxTokens?: number;
      timeout?: number;
      enabled?: boolean;
      default?: boolean;
    }
  ): Promise<AIProvider> => {
    const { data } = await http.post(`${API_BASE_URL}/projects/${projectId}/ai/providers`, provider);
    return data.data;
  },

  updateProvider: async (
    projectId: string,
    providerId: string,
    updates: Partial<{
      name: string;
      provider: AIProviderType;
      model: string;
      endpoint: string;
      apiKey: string;
      organization: string;
      temperature: number;
      topP: number;
      maxTokens: number;
      timeout: number;
      enabled: boolean;
      default: boolean;
    }>
  ): Promise<AIProvider> => {
    const { data } = await http.patch(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}`, updates);
    return data.data;
  },

  deleteProvider: async (projectId: string, providerId: string): Promise<void> => {
    await http.delete(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}`);
  },

  testProvider: async (projectId: string, providerId: string): Promise<AIProviderHealth> => {
    const { data } = await http.post(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}/test`);
    return data.data;
  },

  enableProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await http.post(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}/enable`);
    return data.data;
  },

  disableProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await http.post(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}/disable`);
    return data.data;
  },

  setDefaultProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await http.post(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}/default`);
    return data.data;
  },

  estimateProvider: async (
    projectId: string,
    providerId: string,
    messages: AIProviderMessage[],
    maxTokens?: number
  ): Promise<AIProviderEstimate> => {
    const { data } = await http.post(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}/estimate`, {
      messages,
      maxTokens,
    });
    return data.data;
  },

  generateProvider: async (
    projectId: string,
    providerId: string,
    messages: AIProviderMessage[],
    options?: { maxTokens?: number; temperature?: number; topP?: number; stop?: string[] }
  ): Promise<AIProviderGenerateResult> => {
    const { data } = await http.post(`${API_BASE_URL}/projects/${projectId}/ai/providers/${providerId}/generate`, {
      messages,
      options,
    });
    return data.data;
  },

  listSupportedTypes: async (): Promise<AIProviderType[]> => {
    const { data } = await http.get(`${API_BASE_URL}/ai/providers/types`);
    return data.data;
  },

  listAdapters: async (): Promise<AIProviderAdapterInfo[]> => {
    const { data } = await http.get(`${API_BASE_URL}/ai/providers/adapters`);
    return data.data;
  },
};

export default aiProviderService;
