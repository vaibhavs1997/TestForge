// Dataset service functions for Test Data Library
import axios from 'axios';

const API_BASE = '/api';

export interface DatasetDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
  rowCount: number;
  createdAt: number;
  updatedAt: number;
}

export const datasetService = {
  listDatasets: async (projectId: string): Promise<DatasetDto[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/datasets`);
    return data.data;
  },

  getDataset: async (projectId: string, datasetId: string): Promise<DatasetDto> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/datasets/${datasetId}`);
    return data.data;
  },

  createDataset: async (projectId: string, payload: {
    name: string;
    description?: string;
    category?: string;
  }): Promise<DatasetDto> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/test-data/datasets`, payload);
    return data.data;
  },

  updateDataset: async (projectId: string, datasetId: string, payload: {
    name?: string;
    description?: string;
    category?: string;
  }): Promise<DatasetDto> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/test-data/datasets/${datasetId}`, payload);
    return data.data;
  },

  deleteDataset: async (projectId: string, datasetId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/test-data/datasets/${datasetId}`);
  },
};

export default datasetService;