// EnvironmentRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'node:crypto';
import { EnvironmentEntity } from '../../domain/environment/EnvironmentEntity';
import { readJsonArray, writeJsonArray, updateJsonArray } from '../persistence/JsonFileStore';

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

  private normalizeRecord(raw: Record<string, unknown>): EnvironmentEntity {
    const variables =
      raw.variables && typeof raw.variables === 'object' && !Array.isArray(raw.variables)
        ? (raw.variables as Record<string, string>)
        : {};
    return {
      id: String(raw.id ?? ''),
      projectId: String(raw.projectId ?? ''),
      name: String(raw.name ?? ''),
      baseUrl: String(raw.baseUrl ?? ''),
      description: typeof raw.description === 'string' ? raw.description : '',
      authentication: raw.authentication ?? null,
      variables,
      timeout: typeof raw.timeout === 'number' ? raw.timeout : 30000,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    } as EnvironmentEntity;
  }

  async upsertManyByName(
    projectId: string,
    items: Array<{
      name: string;
      baseUrl: string;
      description?: string;
      authentication?: unknown;
      variables?: Record<string, string>;
      timeout?: number;
    }>,
  ): Promise<{ created: number; updated: number; environments: EnvironmentEntity[] }> {
    if (items.length === 0) {
      return { created: 0, updated: 0, environments: [] };
    }

    this.ensureProjectDir(projectId);
    const filePath = this.getEnvironmentsFilePath(projectId);
    let created = 0;
    let updated = 0;
    const touchedNames = new Set<string>();

    const stored = await updateJsonArray<Record<string, unknown>>(filePath, [], (current) => {
      const next = [...current];
      const now = Date.now();

      for (const item of items) {
        const nameLower = item.name.trim().toLowerCase();
        touchedNames.add(nameLower);
        const index = next.findIndex(
          (e) => String(e.name ?? '').trim().toLowerCase() === nameLower,
        );

        if (index === -1) {
          next.push({
            id: randomUUID(),
            projectId,
            name: item.name.trim(),
            baseUrl: item.baseUrl.trim(),
            description: item.description ?? '',
            authentication: item.authentication ?? null,
            variables: item.variables ?? {},
            timeout: item.timeout ?? 30000,
            createdAt: now,
            updatedAt: now,
          });
          created += 1;
        } else {
          const existing = next[index];
          next[index] = {
            ...existing,
            baseUrl: item.baseUrl.trim(),
            description: item.description ?? existing.description ?? '',
            authentication: item.authentication ?? existing.authentication ?? null,
            variables: item.variables ?? existing.variables ?? {},
            timeout: item.timeout ?? existing.timeout ?? 30000,
            updatedAt: now,
          };
          updated += 1;
        }
      }

      return next;
    });

    const environments = stored
      .filter((row) => touchedNames.has(String(row.name ?? '').trim().toLowerCase()))
      .map((row) => this.normalizeRecord(row));
    return { created, updated, environments };
  }

  async findByProject(projectId: string): Promise<EnvironmentEntity[]> {
    const rows = await this.readEnvironments(projectId);
    return rows.map((row) => this.normalizeRecord(row as unknown as Record<string, unknown>));
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