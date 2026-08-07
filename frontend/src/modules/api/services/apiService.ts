// API service for API Management
import type { AxiosProgressEvent } from 'axios';
import { ApiClient } from '../../../services/ApiClient';
import type { ImportSummary } from '../types';

export interface ApiServiceDto {
  id: string;
  projectId: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  baseUrl?: string;
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

class ApiService extends ApiClient<ApiServiceDto> {
  constructor() {
    super('/projects/:projectId/services');
  }

  // Services
  async listServices(projectId: string): Promise<ApiServiceDto[]> {
    return this.list(projectId);
  }

  async getService(projectId: string, serviceId: string): Promise<ApiServiceDto> {
    return this.get(projectId, serviceId);
  }

  async createService(
    projectId: string,
    payload: {
      name: string;
      description?: string;
      version?: string;
      tags?: string[];
    }
  ): Promise<ApiServiceDto> {
    return this.create(projectId, payload);
  }

  async updateService(
    projectId: string,
    serviceId: string,
    payload: {
      name?: string;
      description?: string;
      version?: string;
      tags?: string[];
    }
  ): Promise<ApiServiceDto> {
    return this.patch(projectId, serviceId, payload);
  }

  async deleteService(projectId: string, serviceId: string): Promise<void> {
    return this.delete(projectId, serviceId);
  }

  // Operations
  async listOperations(projectId: string, serviceId: string): Promise<ApiOperationDto[]> {
    const path = `/projects/${projectId}/services/${serviceId}/apis`;
    return this.getCustom(path);
  }

  async getOperation(projectId: string, serviceId: string, apiId: string): Promise<ApiOperationDto> {
    const path = `/projects/${projectId}/services/${serviceId}/apis/${apiId}`;
    return this.getCustom(path);
  }

  async createOperation(
    projectId: string,
    serviceId: string,
    payload: {
      name: string;
      method: string;
      path: string;
      description?: string;
      authenticationType?: string;
      status?: string;
    }
  ): Promise<ApiOperationDto> {
    const path = `/projects/${projectId}/services/${serviceId}/apis`;
    return this.post(path, payload);
  }

  async updateOperation(
    projectId: string,
    serviceId: string,
    apiId: string,
    payload: {
      name?: string;
      method?: string;
      path?: string;
      description?: string;
      authenticationType?: string;
      status?: string;
    }
  ): Promise<ApiOperationDto> {
    const path = `/projects/${projectId}/services/${serviceId}/apis/${apiId}`;
    return this.post(path, payload, { method: 'PATCH' });
  }

  async deleteOperation(projectId: string, serviceId: string, apiId: string): Promise<void> {
    const path = `/projects/${projectId}/services/${serviceId}/apis/${apiId}`;
    return this.delete(projectId, path.split('/').pop()!);
  }

  // Import Contract
  async importContract(
    projectId: string,
    file: File,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<ImportSummary> {
    const formData = new FormData();
    formData.append('file', file);

    const path = `/projects/${projectId}/import`;
    return this.post(path, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  }

  async importContractFromUrl(projectId: string, url: string): Promise<ImportSummary> {
    const path = `/projects/${projectId}/import/url`;
    return this.post(path, { url });
  }
}

export const apiService = new ApiService();

export default apiService;

