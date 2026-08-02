// Profile service functions for Population Profiles
import axios from 'axios';

const API_BASE = '/api';

export interface PopulationProfileDto {
  id: string;
  datasetId: string;
  columnId: string;
  strategyType: string;
  configuration: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export const profileService = {
  listProfiles: async (projectId: string, datasetId?: string): Promise<PopulationProfileDto[]> => {
    const params = datasetId ? { datasetId } : {};
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/profiles`, { params });
    return data.data;
  },

  getProfile: async (projectId: string, profileId: string): Promise<PopulationProfileDto> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/profiles/${profileId}`);
    return data.data;
  },

  createProfile: async (projectId: string, payload: {
    datasetId: string;
    columnId: string;
    strategyType: string;
    configuration?: Record<string, any>;
  }): Promise<PopulationProfileDto> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/test-data/profiles`, payload);
    return data.data;
  },

  updateProfile: async (projectId: string, profileId: string, payload: {
    strategyType?: string;
    configuration?: Record<string, any>;
  }): Promise<PopulationProfileDto> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/test-data/profiles/${profileId}`, payload);
    return data.data;
  },

  deleteProfile: async (projectId: string, profileId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/test-data/profiles/${profileId}`);
  },
};

export default profileService;