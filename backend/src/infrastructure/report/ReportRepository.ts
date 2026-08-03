// ReportRepository - File-based repository implementation for Reporting Module
// Persists reports to data/reports/{projectId}/reports.json
import * as fs from 'fs';
import * as path from 'path';
import { ReportEntity } from '../../domain/report/ReportEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'reports');

export class ReportRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
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
    const items = await this.readReports(report.projectId);
    items.push(report);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return report;
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
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readReports(projectId: string): ReportEntity[] {
    const filePath = this.getReportsFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default ReportRepository;