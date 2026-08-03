// AI Provider service functions
import axios from 'axios';
import type {
  AIProvider,
  AIProviderType,
  AIProviderHealth,
  AIProviderEstimate,
  AIProviderMessage,
  AIProviderGenerateResult,
  AIProviderAdapterInfo,
} from '../types';

const API_BASE = '/api';

export const aiProviderService = {
  listProviders: async (projectId: string): Promise<AIProvider[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/ai/providers`);
    return data.data;
  },

  getProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}`);
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
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/ai/providers`, provider);
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
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}`, updates);
    return data.data;
  },

  deleteProvider: async (projectId: string, providerId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}`);
  },

  testProvider: async (projectId: string, providerId: string): Promise<AIProviderHealth> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}/test`);
    return data.data;
  },

  enableProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}/enable`);
    return data.data;
  },

  disableProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}/disable`);
    return data.data;
  },

  setDefaultProvider: async (projectId: string, providerId: string): Promise<AIProvider> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}/default`);
    return data.data;
  },

  estimateProvider: async (
    projectId: string,
    providerId: string,
    messages: AIProviderMessage[],
    maxTokens?: number
  ): Promise<AIProviderEstimate> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}/estimate`, {
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
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/ai/providers/${providerId}/generate`, {
      messages,
      options,
    });
    return data.data;
  },

  listSupportedTypes: async (): Promise<AIProviderType[]> => {
    const { data } = await axios.get(`${API_BASE}/ai/providers/types`);
    return data.data;
  },

  listAdapters: async (): Promise<AIProviderAdapterInfo[]> => {
    const { data } = await axios.get(`${API_BASE}/ai/providers/adapters`);
    return data.data;
  },
};

export default aiProviderService;