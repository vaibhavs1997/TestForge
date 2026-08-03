// DependencyRepository - File-based repository implementation for Dependencies
import * as fs from 'fs';
import * as path from 'path';
import { Dependency } from '../../domain/knowledge/DependencyEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'knowledge');

export class DependencyRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'dependencies.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(dependency: Dependency): Promise<Dependency> {
    this.ensureProjectDir(dependency.projectId);
    const filePath = this.getFilePath(dependency.projectId);
    const items = await this.readItems(filePath);
    items.push(dependency);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return dependency;
  }

  async update(id: string, data: Partial<Dependency>): Promise<Dependency> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const index = items.findIndex((d: Dependency) => d.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Dependency with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const filtered = items.filter((d: Dependency) => d.id !== id);
      if (filtered.length !== items.length) {
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<Dependency | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      const dep = items.find((d: Dependency) => d.id === id);
      if (dep) return dep;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<Dependency[]> {
    const filePath = this.getFilePath(projectId);
    return this.readItems(filePath);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const filePath = this.getFilePath(projectId);
    const items = await this.readItems(filePath);
    return items.some((d: Dependency) => d.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<Dependency[]> {
    const projectIds = this.listProjectIds();
    const allItems: Dependency[] = [];
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId);
      const items = await this.readItems(filePath);
      allItems.push(...items);
    }
    return allItems;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter((name) => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readItems(filePath: string): Promise<Dependency[]> {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default DependencyRepository;