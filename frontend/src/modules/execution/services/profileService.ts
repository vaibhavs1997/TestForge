// Execution Profile service functions

import axios from 'axios';
import type { ExecutionProfile, CreateProfileInput } from '../types/profile';
import { API_BASE_URL } from '../../../constants/api';

export const profileService = {
  listByProject: async (projectId: string): Promise<ExecutionProfile[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/execution-profiles`);
    return data.data;
  },

  getDefault: async (projectId: string): Promise<ExecutionProfile | null> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/execution-profiles/default`);
    return data.data;
  },

  getById: async (projectId: string, profileId: string): Promise<ExecutionProfile> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/execution-profiles/${profileId}`);
    return data.data;
  },

  create: async (projectId: string, input: CreateProfileInput): Promise<ExecutionProfile> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/execution-profiles`, input);
    return data.data;
  },

  update: async (projectId: string, profileId: string, updates: Partial<CreateProfileInput>): Promise<ExecutionProfile> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/execution-profiles/${profileId}`, updates);
    return data.data;
  },

  delete: async (projectId: string, profileId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/execution-profiles/${profileId}`);
  },

  duplicate: async (projectId: string, profileId: string, newName: string): Promise<ExecutionProfile> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/execution-profiles/${profileId}/duplicate`, { name: newName });
    return data.data;
  },
};

export default profileService;