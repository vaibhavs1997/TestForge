// Row service functions for Dataset Row management
import axios from 'axios';
import type { DatasetRow, CreateRowInput } from '../types';
import type { ImportResult, ImportTemplate, ColumnMapping } from '../types/import';
import { API_BASE_URL } from '../../../constants/api';

export const rowService = {
  listRows: async (projectId: string, datasetId: string): Promise<DatasetRow[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/test-data/rows`, {
      params: { datasetId },
    });
    return data.data;
  },

  getRow: async (projectId: string, rowId: string): Promise<DatasetRow> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/test-data/rows/${rowId}`);
    return data.data;
  },

  createRow: async (projectId: string, input: CreateRowInput): Promise<DatasetRow> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/test-data/rows`, input);
    return data.data;
  },

  updateRow: async (projectId: string, rowId: string, values: Record<string, any>): Promise<DatasetRow> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/test-data/rows/${rowId}`, { values });
    return data.data;
  },

  deleteRow: async (projectId: string, rowId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/test-data/rows/${rowId}`);
  },

  importData: async (
    projectId: string,
    datasetId: string,
    file: File,
    options: {
      mode: 'append' | 'replace' | 'skipDuplicates';
      onError: 'stop' | 'continue';
      skipEmptyRows: boolean;
    }
  ): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', options.mode);
    formData.append('onError', options.onError);
    formData.append('skipEmptyRows', String(options.skipEmptyRows));

    const { data } = await axios.post(
      `${API_BASE_URL}/projects/${projectId}/test-data/datasets/${datasetId}/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return data.data;
  },

  getImportTemplate: async (projectId: string, datasetId: string): Promise<ImportTemplate> => {
    const { data } = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/test-data/datasets/${datasetId}/import/template`
    );
    return data.data;
  },
};

export default rowService;
