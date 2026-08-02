// Environment service functions for Environment Management
import axios from 'axios';

const API_BASE = '/api';

export interface EnvironmentDto {
  id: string;
  projectId: string;
  name: string;
  baseUrl: string;
  description: string;
  authentication: any;
  variables: Record<string, string>;
  timeout: number;
  createdAt: number;
  updatedAt: number;
}

export const environmentService = {
  listEnvironments: async (projectId: string): Promise<EnvironmentDto[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/environments`);
    return data.data;
  },

  createEnvironment: async (projectId: string, payload: {
    name: string;
    baseUrl: string;
    description?: string;
    authentication?: any;
    variables?: Record<string, string>;
    timeout?: number;
  }): Promise<EnvironmentDto> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/environments`, payload);
    return data.data;
  },

  updateEnvironment: async (projectId: string, environmentId: string, payload: {
    name?: string;
    baseUrl?: string;
    description?: string;
    authentication?: any;
    variables?: Record<string, string>;
    timeout?: number;
    isDefault?: boolean;
  }): Promise<EnvironmentDto> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/environments/${environmentId}`, payload);
    return data.data;
  },

  deleteEnvironment: async (projectId: string, environmentId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/environments/${environmentId}`);
  },
};

export default environmentService;