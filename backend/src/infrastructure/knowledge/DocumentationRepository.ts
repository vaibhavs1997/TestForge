// DocumentationRepository - File-based repository implementation for Documentation
import * as fs from 'fs';
import * as path from 'path';
import { Documentation } from '../../domain/knowledge/DocumentationEntity';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'knowledge');
}

export class DocumentationRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'documentation.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(doc: Documentation): Promise<Documentation> {
    this.ensureProjectDir(doc.projectId);
    const filePath = this.getFilePath(doc.projectId);
    const items = await this.readItems(filePath);
    items.push(doc);
    await writeJsonArray(filePath, items);
    return doc;
  }

  async update(id: string, data: Partial<Documentation>): Promise<Documentation> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const index = items.findIndex((d: Documentation) => d.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        await writeJsonArray(filePath, items);
        return updated;
      }
    }
    throw new Error(`Documentation with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const filtered = items.filter((d: Documentation) => d.id !== id);
      if (filtered.length !== items.length) {
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<Documentation | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const doc = items.find((d: Documentation) => d.id === id);
      if (doc) return doc;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<Documentation[]> {
    const filePath = this.getFilePath(projectId);
    return this.readItems(filePath);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const filePath = this.getFilePath(projectId);
    const items = await this.readItems(filePath);
    return items.some((d: Documentation) => d.title.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<Documentation[]> {
    const projectIds = this.listProjectIds();
    const allItems: Documentation[] = [];
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

  private async readItems(filePath: string): Promise<Documentation[]> {
    const documentation = await readJsonArray<Documentation>(filePath);
    return documentation.filter((doc) => doc && typeof doc.title === 'string' && doc.title.trim().length > 0);
  }
}

export default DocumentationRepository;
