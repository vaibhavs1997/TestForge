// ApiServiceRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'apis');
}

function isServiceRecord(record: unknown): record is ApiServiceEntity {
  if (!record || typeof record !== 'object') return false;
  const r = record as Record<string, unknown>;
  return typeof r.name === 'string' && !('serviceId' in r && 'method' in r);
}

export class ApiServiceRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getServicesFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'services.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(service: ApiServiceEntity): Promise<ApiServiceEntity> {
    this.ensureProjectDir(service.projectId);
    const filePath = this.getServicesFilePath(service.projectId);
    const services = await this.readServices(service.projectId);
    services.push(service);
    await writeJsonArray(filePath, services);
    return service;
  }

  async update(id: string, data: Partial<ApiServiceEntity>): Promise<ApiServiceEntity> {
    // Find the service across all projects
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const services = await this.readServices(projectId);
      const index = services.findIndex(s => s.id === id);
      if (index !== -1) {
        const updated = { ...services[index], ...data, updatedAt: Date.now() };
        services[index] = updated;
        const filePath = this.getServicesFilePath(projectId);
        await writeJsonArray(filePath, services);
        return updated;
      }
    }
    throw new Error(`Service with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      if (await this.deleteInProject(projectId, id)) {
        return;
      }
    }
    throw new Error(`Service with id ${id} not found`);
  }

  /** Delete a service within a specific project (used by the API route). */
  async deleteInProject(projectId: string, id: string): Promise<boolean> {
    const filePath = this.getServicesFilePath(projectId);
    const raw = await readJsonArray<unknown>(filePath);
    const filtered = raw.filter((s) => (s as { id?: string })?.id !== id);
    if (filtered.length === raw.length) {
      return false;
    }
    const sanitized = filtered.filter(isServiceRecord);
    await writeJsonArray(filePath, sanitized);
    return true;
  }

  async deleteByProject(projectId: string): Promise<number> {
    const filePath = this.getServicesFilePath(projectId);
    const raw = await readJsonArray<unknown>(filePath);
    const count = raw.filter(isServiceRecord).length;
    await writeJsonArray(filePath, []);
    return count;
  }

  async findById(id: string): Promise<ApiServiceEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const services = await this.readServices(projectId);
      const service = services.find(s => s.id === id);
      if (service) return service;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ApiServiceEntity[]> {
    return this.readServices(projectId);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const services = await this.readServices(projectId);
    return services.some(s => s.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<ApiServiceEntity[]> {
    const projectIds = this.listProjectIds();
    const allServices: ApiServiceEntity[] = [];
    for (const projectId of projectIds) {
      const services = await this.readServices(projectId);
      allServices.push(...services);
    }
    return allServices;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readServices(projectId: string): Promise<ApiServiceEntity[]> {
    const filePath = this.getServicesFilePath(projectId);
    const raw = await readJsonArray<unknown>(filePath);
    return raw.filter(isServiceRecord);
  }
}

export default ApiServiceRepository;
