// TestSuiteRepository - File-based repository implementation for Test Suite Management
import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteEntity } from '../../domain/suite/TestSuiteEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'test-suites');

export class TestSuiteRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getSuitesFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'suites.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(suite: TestSuiteEntity): Promise<TestSuiteEntity> {
    this.ensureProjectDir(suite.projectId);
    const filePath = this.getSuitesFilePath(suite.projectId);
    const items = await this.readSuites(suite.projectId);
    items.push(suite);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return suite;
  }

  async update(id: string, data: Partial<TestSuiteEntity>): Promise<TestSuiteEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readSuites(projectId);
      const index = items.findIndex(s => s.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getSuitesFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Test Suite with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readSuites(projectId);
      const filtered = items.filter(s => s.id !== id);
      if (filtered.length !== items.length) {
        const filePath = this.getSuitesFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<TestSuiteEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readSuites(projectId);
      const suite = items.find(s => s.id === id);
      if (suite) return suite;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<TestSuiteEntity[]> {
    return this.readSuites(projectId);
  }

  async list(): Promise<TestSuiteEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: TestSuiteEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readSuites(projectId);
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

  private readSuites(projectId: string): TestSuiteEntity[] {
    const filePath = this.getSuitesFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default TestSuiteRepository;