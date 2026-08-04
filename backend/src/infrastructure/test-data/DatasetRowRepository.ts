// DatasetRowRepository - File-based repository implementation for Dataset Rows
import { randomUUID } from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';
import { DatasetRowEntity } from '../../domain/test-data/DatasetRowEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'test-data');

export class DatasetRowRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'rows.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(row: Omit<DatasetRowEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatasetRowEntity> {
    this.ensureProjectDir(row.projectId);
    const filePath = this.getFilePath(row.projectId);
    const items = await this.readItems(filePath);
    const now = Date.now();
    const newRow: DatasetRowEntity = {
      ...row,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    items.push(newRow);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return newRow;
  }

  async update(id: string, data: Partial<Omit<DatasetRowEntity, 'id' | 'projectId' | 'datasetId' | 'createdAt'>>): Promise<DatasetRowEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const index = items.findIndex((r: DatasetRowEntity) => r.id === id);
      if (index !== -1) {
        const updated = {
          ...items[index],
          ...data,
          updatedAt: Date.now(),
        };
        items[index] = updated;
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Dataset Row with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const filtered = items.filter((r: DatasetRowEntity) => r.id !== id);
      if (filtered.length !== items.length) {
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<DatasetRowEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const row = items.find((r: DatasetRowEntity) => r.id === id);
      if (row) return row;
    }
    return null;
  }

  async list(datasetId: string): Promise<DatasetRowEntity[]> {
    const projectIds = this.listProjectIds();
    const results: DatasetRowEntity[] = [];
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const rows = items.filter((r: DatasetRowEntity) => r.datasetId === datasetId);
      results.push(...rows);
    }
    return results;
  }

  async listByProject(projectId: string): Promise<DatasetRowEntity[]> {
    const filePath = this.getFilePath(projectId);
    return this.readItems(filePath);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const filePath = this.getFilePath(projectId);
    const items = await this.readItems(filePath);
    return items.some((r: DatasetRowEntity) => {
      const value = Object.values(r.values)[0];
      return String(value).toLowerCase() === name.toLowerCase();
    });
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter((name) => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readItems(filePath: string): Promise<DatasetRowEntity[]> {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default DatasetRowRepository;