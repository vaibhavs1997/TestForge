// API service for API Management
import type { AxiosProgressEvent } from 'axios';
import { ApiClient } from '../../../services/ApiClient';
import { apiRequest } from '../../../services/apiRequest';
import type {
  ApiContractRefreshResultDto,
  ApiExecutionRequestDto,
  ApiExecutionResponseDto,
  ApiOperationDto,
  ApiServiceDto,
} from '../../../types/apiModels';
import type { ImportSummary } from '../types';
import { API_BASE_URL } from '../../../constants/api';

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

  async deleteApiContract(projectId: string): Promise<{ servicesDeleted: number; operationsDeleted: number }> {
    return apiRequest.delete(`${API_BASE_URL}/projects/${projectId}/api-contract`);
  }

  async refreshApiContract(projectId: string, serviceId: string): Promise<ApiContractRefreshResultDto> {
    return apiRequest.post<ApiContractRefreshResultDto>(
      `${API_BASE_URL}/projects/${projectId}/services/${serviceId}/api-contract/refresh`,
    );
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
      sampleRequestBody?: Record<string, unknown> | null;
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
      sampleRequestBody?: Record<string, unknown> | null;
    }
  ): Promise<ApiOperationDto> {
    return apiRequest.patch<ApiOperationDto>(
      `${API_BASE_URL}/projects/${projectId}/services/${serviceId}/apis/${apiId}`,
      payload,
    );
  }

  async deleteOperation(projectId: string, serviceId: string, apiId: string): Promise<void> {
    await apiRequest.delete(`${API_BASE_URL}/projects/${projectId}/services/${serviceId}/apis/${apiId}`);
  }

  async executeOperation(
    projectId: string,
    payload: ApiExecutionRequestDto,
  ): Promise<ApiExecutionResponseDto> {
    return apiRequest.post<ApiExecutionResponseDto>(
      `${API_BASE_URL}/projects/${projectId}/api-execution`,
      payload,
    );
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

  /** Safe review endpoint; it never writes services, operations, or rules. */
  async previewImportContract(projectId: string, file: File): Promise<ImportSummary> {
    const formData = new FormData();
    formData.append('file', file);
    return this.post(`/projects/${projectId}/import/preview`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  }

  async previewImportContractFromUrl(projectId: string, url: string): Promise<ImportSummary> {
    return this.post(`/projects/${projectId}/import/url/preview`, { url });
  }
}

export const apiService = new ApiService();

export default apiService;

