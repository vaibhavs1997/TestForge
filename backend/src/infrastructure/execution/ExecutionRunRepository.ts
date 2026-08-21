// ExecutionRunRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionRunEntity } from '../../domain/execution/ExecutionRunEntity.js';
import { readJsonArray, updateJsonArray } from '../persistence/JsonFileStore.js';

function cloneForStorage<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'executions');
}

export class ExecutionRunRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getRunsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'runs.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(run: ExecutionRunEntity): Promise<ExecutionRunEntity> {
    this.ensureProjectDir(run.projectId);
    const filePath = this.getRunsFilePath(run.projectId);
    const stored = cloneForStorage(run);
    await updateJsonArray<ExecutionRunEntity>(filePath, [], (items) => [...items, stored]);
    return stored;
  }

  async update(id: string, data: Partial<ExecutionRunEntity>): Promise<ExecutionRunEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getRunsFilePath(projectId);
      let updated: ExecutionRunEntity | null = null;
      await updateJsonArray<ExecutionRunEntity>(filePath, [], (items) => {
        const index = items.findIndex((r) => r.id === id);
        if (index === -1) {
          return items;
        }
        updated = {
          ...items[index],
          ...cloneForStorage(data),
          updatedAt: Date.now(),
        };
        const next = [...items];
        next[index] = updated;
        return next;
      });
      if (updated) {
        return updated;
      }
    }
    throw new Error(`Execution Run with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      const next = items.filter((run) => run.id !== id);
      if (next.length !== items.length) {
        await updateJsonArray<ExecutionRunEntity>(this.getRunsFilePath(projectId), [], () => next);
        return;
      }
    }
    throw new Error(`Execution Run with id ${id} not found`);
  }

  async deleteByProject(projectId: string): Promise<number> {
    const items = await this.readRuns(projectId);
    if (items.length === 0) return 0;
    await updateJsonArray<ExecutionRunEntity>(this.getRunsFilePath(projectId), [], () => []);
    return items.length;
  }

  async findById(id: string): Promise<ExecutionRunEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      const run = items.find(r => r.id === id);
      if (run) return run;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ExecutionRunEntity[]> {
    const items = await this.readRuns(projectId);
    return Array.isArray(items) ? items : [];
  }

  async findByRequirement(requirementId: string): Promise<ExecutionRunEntity[]> {
    const projectIds = this.listProjectIds();
    const results: ExecutionRunEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      const filtered = items.filter(r => r.requirementId === requirementId);
      results.push(...filtered);
    }
    return results;
  }

  async list(): Promise<ExecutionRunEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: ExecutionRunEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      allItems.push(...items);
    }
    return allItems;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readRuns(projectId: string): Promise<ExecutionRunEntity[]> {
    const filePath = this.getRunsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default ExecutionRunRepository;
