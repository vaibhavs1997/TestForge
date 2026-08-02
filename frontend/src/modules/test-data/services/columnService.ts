// Column service functions for Dataset Columns
import axios from 'axios';

const API_BASE = '/api';

export interface ColumnDto {
  id: string;
  datasetId: string;
  name: string;
  displayName: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  nullable: boolean;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface ColumnSuggestion {
  name: string;
  displayName: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  nullable: boolean;
  description: string;
  usedBy: string[];
}

export const columnService = {
  listColumns: async (projectId: string, datasetId?: string): Promise<ColumnDto[]> => {
    const params = datasetId ? { datasetId } : {};
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/columns`, { params });
    return data.data;
  },

  getColumn: async (projectId: string, columnId: string): Promise<ColumnDto> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/columns/${columnId}`);
    return data.data;
  },

  createColumn: async (projectId: string, payload: {
    datasetId: string;
    name: string;
    displayName: string;
    dataType: string;
    required: boolean;
    unique: boolean;
    nullable: boolean;
    description?: string;
  }): Promise<ColumnDto> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/test-data/columns`, payload);
    return data.data;
  },

  updateColumn: async (projectId: string, columnId: string, payload: {
    name?: string;
    displayName?: string;
    dataType?: string;
    required?: boolean;
    unique?: boolean;
    nullable?: boolean;
    description?: string;
  }): Promise<ColumnDto> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/test-data/columns/${columnId}`, payload);
    return data.data;
  },

  deleteColumn: async (projectId: string, columnId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/test-data/columns/${columnId}`);
  },

  suggestColumns: async (projectId: string, datasetName: string): Promise<{ suggestions: ColumnSuggestion[] }> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/columns/suggest`, {
      params: { datasetName },
    });
    return data.data;
  },
};

export default columnService;