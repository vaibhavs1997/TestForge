// TestSuiteRepository - File-based repository implementation for Test Suite Management
import * as fs from 'fs';
import * as path from 'path';
import { TestSuiteEntity } from '../../domain/suite/TestSuiteEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'test-suites');
}

export class TestSuiteRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
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
    await writeJsonArray(filePath, items);
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
        await writeJsonArray(filePath, items);
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
        await writeJsonArray(filePath, filtered);
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
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readSuites(projectId: string): Promise<TestSuiteEntity[]> {
    const filePath = this.getSuitesFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default TestSuiteRepository;