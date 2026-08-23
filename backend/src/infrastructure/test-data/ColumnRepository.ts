// ColumnRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ColumnEntity } from '../../domain/test-data/ColumnEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'test-data');
}

export class ColumnRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getColumnsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'columns.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(column: ColumnEntity): Promise<ColumnEntity> {
    this.ensureProjectDir(column.datasetId.split('-')[0] || '1');
    const projectId = column.datasetId.split('-')[0] || '1';
    const filePath = this.getColumnsFilePath(projectId);
    const columns = await this.readColumns(projectId);
    columns.push(column);
    await writeJsonArray(filePath, columns);
    return column;
  }

  async update(id: string, data: Partial<ColumnEntity>): Promise<ColumnEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const columns = await this.readColumns(projectId);
      const index = columns.findIndex(c => c.id === id);
      if (index !== -1) {
        const updated = { ...columns[index], ...data, updatedAt: Date.now() };
        columns[index] = updated;
        const filePath = this.getColumnsFilePath(projectId);
        await writeJsonArray(filePath, columns);
        return updated;
      }
    }
    throw new Error(`Column with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const columns = await this.readColumns(projectId);
      const filtered = columns.filter(c => c.id !== id);
      if (filtered.length !== columns.length) {
        const filePath = this.getColumnsFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<ColumnEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const columns = await this.readColumns(projectId);
      const column = columns.find(c => c.id === id);
      if (column) return column;
    }
    return null;
  }

  async findByDataset(datasetId: string): Promise<ColumnEntity[]> {
    const projectId = datasetId.split('-')[0] || '1';
    return this.readColumns(projectId);
  }

  async existsByName(name: string, datasetId: string): Promise<boolean> {
    const projectId = datasetId.split('-')[0] || '1';
    const columns = await this.readColumns(projectId);
    return columns.some(c => c.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<ColumnEntity[]> {
    const projectIds = this.listProjectIds();
    const allColumns: ColumnEntity[] = [];
    for (const projectId of projectIds) {
      const columns = await this.readColumns(projectId);
      allColumns.push(...columns);
    }
    return allColumns;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readColumns(projectId: string): Promise<ColumnEntity[]> {
    const filePath = this.getColumnsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default ColumnRepository;