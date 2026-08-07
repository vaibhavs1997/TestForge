// Dataset service for Test Data Library
import { ApiClient } from '../../../services/ApiClient';

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

class DatasetService extends ApiClient<DatasetDto> {
  constructor() {
    super('/projects/:projectId/test-data/datasets');
  }

  async listDatasets(projectId: string): Promise<DatasetDto[]> {
    return this.list(projectId);
  }

  async getDataset(projectId: string, datasetId: string): Promise<DatasetDto> {
    return this.get(projectId, datasetId);
  }

  async createDataset(
    projectId: string,
    payload: {
      name: string;
      description?: string;
      category?: string;
    }
  ): Promise<DatasetDto> {
    return this.create(projectId, payload);
  }

  async updateDataset(
    projectId: string,
    datasetId: string,
    payload: {
      name?: string;
      description?: string;
      category?: string;
    }
  ): Promise<DatasetDto> {
    return this.patch(projectId, datasetId, payload);
  }

  async deleteDataset(projectId: string, datasetId: string): Promise<void> {
    return this.delete(projectId, datasetId);
  }
}

export const datasetService = new DatasetService();

export default datasetService;