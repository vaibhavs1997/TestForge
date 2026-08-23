// RuntimeVariableRepository - File-based repository implementation for Runtime Variables
import * as fs from 'fs';
import * as path from 'path';
import { RuntimeVariable } from '../../domain/knowledge/RuntimeVariableEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'knowledge');
}

export class RuntimeVariableRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'runtime-variables.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(variable: RuntimeVariable): Promise<RuntimeVariable> {
    this.ensureProjectDir(variable.projectId);
    const filePath = this.getFilePath(variable.projectId);
    const items = await this.readItems(filePath);
    items.push(variable);
    await writeJsonArray(filePath, items);
    return variable;
  }

  async update(id: string, data: Partial<RuntimeVariable>): Promise<RuntimeVariable> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const index = items.findIndex((v: RuntimeVariable) => v.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        await writeJsonArray(filePath, items);
        return updated;
      }
    }
    throw new Error(`Runtime Variable with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const filtered = items.filter((v: RuntimeVariable) => v.id !== id);
      if (filtered.length !== items.length) {
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<RuntimeVariable | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const variable = items.find((v: RuntimeVariable) => v.id === id);
      if (variable) return variable;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<RuntimeVariable[]> {
    const filePath = this.getFilePath(projectId);
    return this.readItems(filePath);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const filePath = this.getFilePath(projectId);
    const items = await this.readItems(filePath);
    return items.some((v: RuntimeVariable) => v.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<RuntimeVariable[]> {
    const projectIds = this.listProjectIds();
    const allItems: RuntimeVariable[] = [];
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      allItems.push(...items);
    }
    return allItems;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter((name) => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readItems(filePath: string): Promise<RuntimeVariable[]> {
    const variables = await readJsonArray<RuntimeVariable>(filePath);
    return variables.filter((variable) => variable && typeof variable.name === 'string' && variable.name.trim().length > 0);
  }
}

export default RuntimeVariableRepository;
