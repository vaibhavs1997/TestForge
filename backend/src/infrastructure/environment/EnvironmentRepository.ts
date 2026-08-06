// EnvironmentRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'environments');
}

export class EnvironmentRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getEnvironmentsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'environments.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(environment: EnvironmentEntity): Promise<EnvironmentEntity> {
    this.ensureProjectDir(environment.projectId);
    const filePath = this.getEnvironmentsFilePath(environment.projectId);
    const environments = await this.readEnvironments(environment.projectId);
    environments.push(environment);
    await writeJsonArray(filePath, environments);
    return environment;
  }

  async update(id: string, data: Partial<EnvironmentEntity>): Promise<EnvironmentEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const environments = await this.readEnvironments(projectId);
      const index = environments.findIndex(e => e.id === id);
      if (index !== -1) {
        const updated = { ...environments[index], ...data, updatedAt: Date.now() };
        environments[index] = updated;
        const filePath = this.getEnvironmentsFilePath(projectId);
        await writeJsonArray(filePath, environments);
        return updated;
      }
    }
    throw new Error(`Environment with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const environments = await this.readEnvironments(projectId);
      const filtered = environments.filter(e => e.id !== id);
      if (filtered.length !== environments.length) {
        const filePath = this.getEnvironmentsFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<EnvironmentEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const environments = await this.readEnvironments(projectId);
      const environment = environments.find(e => e.id === id);
      if (environment) return environment;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<EnvironmentEntity[]> {
    return this.readEnvironments(projectId);
  }

  async findDefault(projectId: string): Promise<EnvironmentEntity | null> {
    const environments = await this.readEnvironments(projectId);
    return environments.find(e => e.name === 'Default') || null;
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const environments = await this.readEnvironments(projectId);
    return environments.some(e => e.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<EnvironmentEntity[]> {
    const projectIds = this.listProjectIds();
    const allEnvironments: EnvironmentEntity[] = [];
    for (const projectId of projectIds) {
      const environments = await this.readEnvironments(projectId);
      allEnvironments.push(...environments);
    }
    return allEnvironments;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readEnvironments(projectId: string): Promise<EnvironmentEntity[]> {
    const filePath = this.getEnvironmentsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default EnvironmentRepository;