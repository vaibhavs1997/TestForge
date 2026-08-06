// ApiServiceRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ApiServiceEntity } from '../../domain/api/ApiServiceEntity';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'apis');
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
      const services = await this.readServices(projectId);
      const filtered = services.filter(s => s.id !== id);
      if (filtered.length !== services.length) {
        const filePath = this.getServicesFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
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
    return readJsonArray<ApiServiceEntity>(filePath);
  }
}

export default ApiServiceRepository;