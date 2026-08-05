// BusinessRuleRepository - File-based repository implementation for Business Rules
import * as fs from 'fs';
import * as path from 'path';
import { BusinessRule } from '../../domain/knowledge/BusinessRuleEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'knowledge');

export class BusinessRuleRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getFilePath(projectId: string, fileName: string): string {
    return path.join(this.getProjectDir(projectId), fileName);
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(rule: BusinessRule): Promise<BusinessRule> {
    this.ensureProjectDir(rule.projectId);
    const filePath = this.getFilePath(rule.projectId, 'business-rules.json');
    const items = await this.readItems(filePath);
    items.push(rule);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return rule;
  }

  async update(id: string, data: Partial<BusinessRule>): Promise<BusinessRule> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId, 'business-rules.json');
      const items = await this.readItems(filePath);
      const index = items.findIndex((r: BusinessRule) => r.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Business Rule with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId, 'business-rules.json');
      const items = await this.readItems(filePath);
      const filtered = items.filter((r: BusinessRule) => r.id !== id);
      if (filtered.length !== items.length) {
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<BusinessRule | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId, 'business-rules.json');
      const items = await this.readItems(filePath);
      const rule = items.find((r: BusinessRule) => r.id === id);
      if (rule) return rule;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<BusinessRule[]> {
    const filePath = this.getFilePath(projectId, 'business-rules.json');
    return this.readItems(filePath);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const filePath = this.getFilePath(projectId, 'business-rules.json');
    const items = await this.readItems(filePath);
    return items.some((r: BusinessRule) => r.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<BusinessRule[]> {
    const projectIds = this.listProjectIds();
    const allItems: BusinessRule[] = [];
    for (const projectId of projectIds) {
      const filePath = this.getFilePath(projectId, 'business-rules.json');
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

  private async readItems(filePath: string): Promise<BusinessRule[]> {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default BusinessRuleRepository;