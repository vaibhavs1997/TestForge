// API service functions for API Management
import axios from 'axios';
import type { AxiosProgressEvent } from 'axios';
import type { ImportSummary } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export interface ApiServiceDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ApiOperationDto {
  id: string;
  serviceId: string;
  name: string;
  method: string;
  path: string;
  description: string;
  authenticationType: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

export const apiService = {
  // Services
  listServices: async (projectId: string): Promise<ApiServiceDto[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/services`);
    return data.data;
  },

  getService: async (projectId: string, serviceId: string): Promise<ApiServiceDto> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}`);
    return data.data;
  },

  createService: async (projectId: string, payload: {
    name: string;
    description?: string;
    version?: string;
    tags?: string[];
  }): Promise<ApiServiceDto> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/services`, payload);
    return data.data;
  },

  updateService: async (projectId: string, serviceId: string, payload: {
    name?: string;
    description?: string;
    version?: string;
    tags?: string[];
  }): Promise<ApiServiceDto> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}`, payload);
    return data.data;
  },

  deleteService: async (projectId: string, serviceId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}`);
  },

  // Operations
  listOperations: async (projectId: string, serviceId: string): Promise<ApiOperationDto[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}/apis`);
    return data.data;
  },

  getOperation: async (projectId: string, serviceId: string, apiId: string): Promise<ApiOperationDto> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}/apis/${apiId}`);
    return data.data;
  },

  createOperation: async (projectId: string, serviceId: string, payload: {
    name: string;
    method: string;
    path: string;
    description?: string;
    authenticationType?: string;
    status?: string;
  }): Promise<ApiOperationDto> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}/apis`, payload);
    return data.data;
  },

  updateOperation: async (projectId: string, serviceId: string, apiId: string, payload: {
    name?: string;
    method?: string;
    path?: string;
    description?: string;
    authenticationType?: string;
    status?: string;
  }): Promise<ApiOperationDto> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}/apis/${apiId}`, payload);
    return data.data;
  },

  deleteOperation: async (projectId: string, serviceId: string, apiId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}/apis/${apiId}`);
  },

  // Import Contract
  importContract: async (
    projectId: string,
    file: File,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<ImportSummary> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });

    return data.data as ImportSummary;
  },
};

export default apiService;

