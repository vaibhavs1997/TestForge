// AnalysisRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'analysis');

export class AnalysisRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
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
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
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
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
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
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
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
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readAnalysis(projectId: string): AnalysisEntity[] {
    const filePath = this.getAnalysisFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default AnalysisRepository;