// Dataset service for Test Data Library
import { ApiClient } from '../../../services/ApiClient';
import type { DatasetDto } from '../../../types/moduleContracts';
import { normalizeDataset } from '../../../utils/moduleAdapters';

class DatasetService extends ApiClient<DatasetDto> {
  constructor() {
    super('/projects/:projectId/test-data/datasets');
  }

  async listDatasets(projectId: string): Promise<DatasetDto[]> {
    return (await this.list(projectId)).map(normalizeDataset);
  }

  async getDataset(projectId: string, datasetId: string): Promise<DatasetDto> {
    return normalizeDataset(await this.get(projectId, datasetId));
  }

  async createDataset(
    projectId: string,
    payload: {
      name: string;
      description?: string;
      category?: string;
    }
  ): Promise<DatasetDto> {
    return normalizeDataset(await this.create(projectId, payload));
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
    return normalizeDataset(await this.patch(projectId, datasetId, payload));
  }

  async deleteDataset(projectId: string, datasetId: string): Promise<void> {
    return this.delete(projectId, datasetId);
  }
}

export const datasetService = new DatasetService();

export default datasetService;
