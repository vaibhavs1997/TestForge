// ReportRepository - File-based repository implementation for Reporting Module
// Persists reports to data/reports/{projectId}/reports.json
import * as fs from 'fs';
import * as path from 'path';
import { ReportEntity } from '../../domain/report/ReportEntity.js';
import { readJsonArray, writeJsonArray, updateJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'reports');
}

export class ReportRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getReportsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'reports.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(report: ReportEntity): Promise<ReportEntity> {
    this.ensureProjectDir(report.projectId);
    const filePath = this.getReportsFilePath(report.projectId);
    let persisted = report;
    await updateJsonArray<ReportEntity>(filePath, [], items => {
      const existing = items.find(item => item.executionRunId === report.executionRunId);
      persisted = existing ? { ...report, id: existing.id } : report;
      return [...items.filter(item => item.executionRunId !== report.executionRunId), persisted];
    });
    return persisted;
  }

  async findById(id: string): Promise<ReportEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readReports(projectId);
      const report = items.find(r => r.id === id);
      if (report) return report;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ReportEntity[]> {
    return this.readReports(projectId);
  }

  async findByExecutionRun(executionRunId: string): Promise<ReportEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readReports(projectId);
      const report = items.find(r => r.executionRunId === executionRunId);
      if (report) return report;
    }
    return null;
  }

  async findBySuite(suiteId: string): Promise<ReportEntity[]> {
    const projectIds = this.listProjectIds();
    const results: ReportEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readReports(projectId);
      const filtered = items.filter(r => r.suiteId === suiteId);
      results.push(...filtered);
    }
    return results;
  }

  async list(): Promise<ReportEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: ReportEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readReports(projectId);
      allItems.push(...items);
    }
    return allItems;
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readReports(projectId);
      const filtered = items.filter(r => r.id !== id);
      if (filtered.length !== items.length) {
        const filePath = this.getReportsFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readReports(projectId: string): Promise<ReportEntity[]> {
    const filePath = this.getReportsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default ReportRepository;