// Mapping service functions for Data Source Intelligence
import axios from 'axios';

const API_BASE = '/api';

export interface DataSourceMappingDto {
  id: string;
  projectId: string;
  serviceId: string;
  operationId: string;
  fieldPath: string;
  sourceType: string;
  datasetId?: string;
  datasetColumn?: string;
  environmentVariable?: string;
  runtimeOperationId?: string;
  runtimeField?: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export const mappingService = {
  listMappings: async (projectId: string, operationId?: string): Promise<DataSourceMappingDto[]> => {
    const params = operationId ? { operationId } : {};
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/mappings`, { params });
    return data.data;
  },

  getMapping: async (projectId: string, mappingId: string): Promise<DataSourceMappingDto> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/test-data/mappings/${mappingId}`);
    return data.data;
  },

  createMapping: async (projectId: string, payload: {
    serviceId: string;
    operationId: string;
    fieldPath: string;
    sourceType: string;
    datasetId?: string;
    datasetColumn?: string;
    environmentVariable?: string;
    runtimeOperationId?: string;
    runtimeField?: string;
    notes?: string;
  }): Promise<DataSourceMappingDto> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/test-data/mappings`, payload);
    return data.data;
  },

  updateMapping: async (projectId: string, mappingId: string, payload: {
    fieldPath?: string;
    sourceType?: string;
    datasetId?: string;
    datasetColumn?: string;
    environmentVariable?: string;
    runtimeOperationId?: string;
    runtimeField?: string;
    notes?: string;
  }): Promise<DataSourceMappingDto> => {
    const { data } = await axios.patch(`${API_BASE}/projects/${projectId}/test-data/mappings/${mappingId}`, payload);
    return data.data;
  },

  deleteMapping: async (projectId: string, mappingId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/test-data/mappings/${mappingId}`);
  },
};

export default mappingService;