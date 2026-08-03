// Row service functions for Dataset Row management
import axios from 'axios';
import type { DatasetRow, CreateRowInput } from '../types';

const API_BASE = '/api';

export const rowService = {
  listRows: async (projectId: string, datasetId: string): Promise<DatasetRow[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/rows`, {
      params: { datasetId },
    });
    return data.data;
  },

  getRow: async (projectId: string, rowId: string): Promise<DatasetRow> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/rows/${rowId}`);
    return data.data;
  },

  createRow: async (projectId: string, input: CreateRowInput): Promise<DatasetRow> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/test-data/rows`, input);
    return data.data;
  },

  updateRow: async (projectId: string, rowId: string, values: Record<string, any>): Promise<DatasetRow> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/test-data/rows/${rowId}`, { values });
    return data.data;
  },

  deleteRow: async (projectId: string, rowId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/test-data/rows/${rowId}`);
  },
};

export default rowService;