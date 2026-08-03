// TestDesignRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { TestDesignEntity } from '../../domain/requirements/TestDesignEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'test-designs');

export class TestDesignRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getDesignsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'designs.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(design: TestDesignEntity): Promise<TestDesignEntity> {
    this.ensureProjectDir(design.projectId);
    const filePath = this.getDesignsFilePath(design.projectId);
    const items = await this.readDesigns(design.projectId);
    items.push(design);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return design;
  }

  async update(id: string, data: Partial<TestDesignEntity>): Promise<TestDesignEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const index = items.findIndex(d => d.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getDesignsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Test Design with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const filtered = items.filter(d => d.id !== id);
      if (filtered.length !== items.length) {
        const filePath = this.getDesignsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<TestDesignEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const design = items.find(d => d.id === id);
      if (design) return design;
    }
    return null;
  }

  async findByRequirement(requirementId: string): Promise<TestDesignEntity[]> {
    const projectIds = this.listProjectIds();
    const results: TestDesignEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const filtered = items.filter(d => d.requirementId === requirementId);
      results.push(...filtered);
    }
    return results;
  }

  async findByStrategyItem(strategyItemId: string): Promise<TestDesignEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const design = items.find(d => d.strategyItemId === strategyItemId);
      if (design) return design;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<TestDesignEntity[]> {
    return this.readDesigns(projectId);
  }

  async list(): Promise<TestDesignEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: TestDesignEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      allItems.push(...items);
    }
    return allItems;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readDesigns(projectId: string): TestDesignEntity[] {
    const filePath = this.getDesignsFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default TestDesignRepository;