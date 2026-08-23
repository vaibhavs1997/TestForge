// DataSourceMappingRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { DataSourceMappingEntity } from '../../domain/test-data/DataSourceMappingEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'test-data');
}

export class DataSourceMappingRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getMappingsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'mappings.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(mapping: DataSourceMappingEntity): Promise<DataSourceMappingEntity> {
    this.ensureProjectDir(mapping.projectId);
    const filePath = this.getMappingsFilePath(mapping.projectId);
    const mappings = await this.readMappings(mapping.projectId);
    mappings.push(mapping);
    await writeJsonArray(filePath, mappings);
    return mapping;
  }

  async update(id: string, data: Partial<DataSourceMappingEntity>): Promise<DataSourceMappingEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const mappings = await this.readMappings(projectId);
      const index = mappings.findIndex(m => m.id === id);
      if (index !== -1) {
        const updated = { ...mappings[index], ...data, updatedAt: Date.now() };
        mappings[index] = updated;
        const filePath = this.getMappingsFilePath(projectId);
        await writeJsonArray(filePath, mappings);
        return updated;
      }
    }
    throw new Error(`Mapping with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const mappings = await this.readMappings(projectId);
      const filtered = mappings.filter(m => m.id !== id);
      if (filtered.length !== mappings.length) {
        const filePath = this.getMappingsFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<DataSourceMappingEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const mappings = await this.readMappings(projectId);
      const mapping = mappings.find(m => m.id === id);
      if (mapping) return mapping;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<DataSourceMappingEntity[]> {
    return this.readMappings(projectId);
  }

  async findByOperation(operationId: string): Promise<DataSourceMappingEntity[]> {
    const projectIds = this.listProjectIds();
    const allMappings: DataSourceMappingEntity[] = [];
    for (const projectId of projectIds) {
      const mappings = await this.readMappings(projectId);
      const operationMappings = mappings.filter(m => m.operationId === operationId);
      allMappings.push(...operationMappings);
    }
    return allMappings;
  }

  async findByProjectAndOperation(projectId: string, serviceId: string, operationId: string): Promise<DataSourceMappingEntity[]> {
    const mappings = await this.readMappings(projectId);
    return mappings.filter(
      (m) =>
        m.operationId === operationId && (!serviceId || m.serviceId === serviceId),
    );
  }

  async existsByField(operationId: string, fieldPath: string): Promise<boolean> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const mappings = await this.readMappings(projectId);
      const exists = mappings.some(m => m.operationId === operationId && m.fieldPath === fieldPath);
      if (exists) return true;
    }
    return false;
  }

  async list(): Promise<DataSourceMappingEntity[]> {
    const projectIds = this.listProjectIds();
    const allMappings: DataSourceMappingEntity[] = [];
    for (const projectId of projectIds) {
      const mappings = await this.readMappings(projectId);
      allMappings.push(...mappings);
    }
    return allMappings;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readMappings(projectId: string): Promise<DataSourceMappingEntity[]> {
    const filePath = this.getMappingsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default DataSourceMappingRepository;