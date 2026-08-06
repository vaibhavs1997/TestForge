// AnalysisRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'analysis');
}

export class AnalysisRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getAnalysisFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'analysis.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(analysis: AnalysisEntity): Promise<AnalysisEntity> {
    this.ensureProjectDir(analysis.projectId);
    const filePath = this.getAnalysisFilePath(analysis.projectId);
    const items = await this.readAnalysis(analysis.projectId);
    items.push(analysis);
    await writeJsonArray(filePath, items);
    return analysis;
  }

  async update(id: string, data: Partial<AnalysisEntity>): Promise<AnalysisEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readAnalysis(projectId);
      const index = items.findIndex(a => a.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getAnalysisFilePath(projectId);
        await writeJsonArray(filePath, items);
        return updated;
      }
    }
    throw new Error(`Analysis with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readAnalysis(projectId);
      const filtered = items.filter(a => a.id !== id);
      if (filtered.length !== items.length) {
        const filePath = this.getAnalysisFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<AnalysisEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readAnalysis(projectId);
      const analysis = items.find(a => a.id === id);
      if (analysis) return analysis;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<AnalysisEntity[]> {
    return this.readAnalysis(projectId);
  }

  async list(): Promise<AnalysisEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: AnalysisEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readAnalysis(projectId);
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

  private async readAnalysis(projectId: string): Promise<AnalysisEntity[]> {
    const filePath = this.getAnalysisFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default AnalysisRepository;