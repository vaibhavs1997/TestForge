// Column service for Dataset Columns
import { ApiClient } from '../../../services/ApiClient';

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

class ColumnService extends ApiClient<ColumnDto> {
  constructor() {
    super('/projects/:projectId/test-data/columns');
  }

  async listColumns(projectId: string, datasetId?: string): Promise<ColumnDto[]> {
    const params = datasetId ? { datasetId } : {};
    return this.list(projectId, params);
  }

  async getColumn(projectId: string, columnId: string): Promise<ColumnDto> {
    return this.get(projectId, columnId);
  }

  async createColumn(
    projectId: string,
    payload: {
      datasetId: string;
      name: string;
      displayName: string;
      dataType: string;
      required: boolean;
      unique: boolean;
      nullable: boolean;
      description?: string;
    }
  ): Promise<ColumnDto> {
    return this.create(projectId, payload);
  }

  async updateColumn(
    projectId: string,
    columnId: string,
    payload: {
      name?: string;
      displayName?: string;
      dataType?: string;
      required?: boolean;
      unique?: boolean;
      nullable?: boolean;
      description?: string;
    }
  ): Promise<ColumnDto> {
    return this.patch(projectId, columnId, payload);
  }

  async deleteColumn(projectId: string, columnId: string): Promise<void> {
    return this.delete(projectId, columnId);
  }

  async suggestColumns(projectId: string, datasetName: string): Promise<{ suggestions: ColumnSuggestion[] }> {
    return this.getCustom(`/projects/:projectId/test-data/columns/suggest`.replace(':projectId', projectId), {
      datasetName,
    });
  }
}

export const columnService = new ColumnService();

export default columnService;