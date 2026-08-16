// Column service for Dataset Columns
import { ApiClient } from '../../../services/ApiClient';
import type { ColumnDto } from '../../../types/moduleContracts';
import { normalizeColumn } from '../../../utils/moduleAdapters';

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
    return (await this.list(projectId, params)).map(normalizeColumn);
  }

  async getColumn(projectId: string, columnId: string): Promise<ColumnDto> {
    return normalizeColumn(await this.get(projectId, columnId));
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
    return normalizeColumn(await this.create(projectId, payload));
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
    return normalizeColumn(await this.patch(projectId, columnId, payload));
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
