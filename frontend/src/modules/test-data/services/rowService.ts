// Row service for Dataset Row management
import { AxiosProgressEvent } from 'axios';
import { ApiClient } from '../../../services/ApiClient';
import type { DatasetRow, CreateRowInput } from '../types';
import type { ImportResult, ImportTemplate, ColumnMapping } from '../types/import';

class RowService extends ApiClient<DatasetRow> {
  constructor() {
    super('/projects/:projectId/test-data/rows');
  }

  async listRows(projectId: string, datasetId: string): Promise<DatasetRow[]> {
    return this.list(projectId, { datasetId });
  }

  async getRow(projectId: string, rowId: string): Promise<DatasetRow> {
    return this.get(projectId, rowId);
  }

  async createRow(projectId: string, input: CreateRowInput): Promise<DatasetRow> {
    return this.create(projectId, input);
  }

  async updateRow(projectId: string, rowId: string, values: Record<string, any>): Promise<DatasetRow> {
    return this.patch(projectId, rowId, { values });
  }

  async deleteRow(projectId: string, rowId: string): Promise<void> {
    return this.delete(projectId, rowId);
  }

  async importData(
    projectId: string,
    datasetId: string,
    file: File,
    options: {
      mode: 'append' | 'replace' | 'skipDuplicates';
      onError: 'stop' | 'continue';
      skipEmptyRows: boolean;
    }
  ): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', options.mode);
    formData.append('onError', options.onError);
    formData.append('skipEmptyRows', String(options.skipEmptyRows));

    const path = `/projects/${projectId}/test-data/datasets/${datasetId}/import`;
    return this.post(path, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getImportTemplate(projectId: string, datasetId: string): Promise<ImportTemplate> {
    const path = `/projects/${projectId}/test-data/datasets/${datasetId}/import/template`;
    return this.getCustom(path);
  }
}

export const rowService = new RowService();

export default rowService;
