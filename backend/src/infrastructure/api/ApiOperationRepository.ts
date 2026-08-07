// ApiOperationRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'apis');
}

export class ApiOperationRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getOperationsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'operations.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(operation: ApiOperationEntity): Promise<ApiOperationEntity> {
    this.ensureProjectDir(operation.projectId);
    const filePath = this.getOperationsFilePath(operation.projectId);
    const operations = await this.readOperations(operation.projectId);
    operations.push(operation);
    await writeJsonArray(filePath, operations);
    return operation;
  }

  async update(id: string, data: Partial<ApiOperationEntity>): Promise<ApiOperationEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const operations = await this.readOperations(projectId);
      const index = operations.findIndex(o => o.id === id);
      if (index !== -1) {
        const updated = { ...operations[index], ...data, updatedAt: Date.now() };
        operations[index] = updated;
        const filePath = this.getOperationsFilePath(projectId);
        await writeJsonArray(filePath, operations);
        return updated;
      }
    }
    throw new Error(`Operation with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const operations = await this.readOperations(projectId);
      const filtered = operations.filter(o => o.id !== id);
      if (filtered.length !== operations.length) {
        const filePath = this.getOperationsFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<ApiOperationEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const operations = await this.readOperations(projectId);
      const operation = operations.find(o => o.id === id);
      if (operation) return operation;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ApiOperationEntity[]> {
    return this.readOperations(projectId);
  }

  async findByProjectAndService(projectId: string, serviceId: string): Promise<ApiOperationEntity[]> {
    const operations = await this.readOperations(projectId);
    return operations.filter(
      (o) => o.serviceId === serviceId && Boolean(o.method) && Boolean(o.path),
    );
  }

  async deleteByServiceId(projectId: string, serviceId: string): Promise<void> {
    const filePath = this.getOperationsFilePath(projectId);
    const operations = await this.readOperations(projectId);
    const filtered = operations.filter((o) => o.serviceId !== serviceId);
    if (filtered.length !== operations.length) {
      await writeJsonArray(filePath, filtered);
    }
  }

  async findByService(serviceId: string): Promise<ApiOperationEntity[]> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filtered = await this.findByProjectAndService(projectId, serviceId);
      if (filtered.length > 0) return filtered;
    }
    return [];
  }

  async list(): Promise<ApiOperationEntity[]> {
    const projectIds = this.listProjectIds();
    const allOperations: ApiOperationEntity[] = [];
    for (const projectId of projectIds) {
      const operations = await this.readOperations(projectId);
      allOperations.push(...operations);
    }
    return allOperations;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readOperations(projectId: string): Promise<ApiOperationEntity[]> {
    const filePath = this.getOperationsFilePath(projectId);
    const raw = await readJsonArray<ApiOperationEntity>(filePath);
    return raw.filter(
      (o) => Boolean(o?.serviceId) && typeof o.method === 'string' && typeof o.path === 'string',
    );
  }
}

export default ApiOperationRepository;