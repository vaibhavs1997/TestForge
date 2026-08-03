// ManageReports - Application Use Case for Reporting Module
// Handles CRUD operations for reports (create, get, list, delete).
// Report generation is handled by GenerateReport use case.
import { ReportEntity } from '../../domain/report/ReportEntity';
import { ReportRepository } from '../../domain/report/ReportRepository';

export class ManageReports {
  constructor(private readonly reportRepository: ReportRepository) {}

  async create(report: ReportEntity): Promise<ReportEntity> {
    return this.reportRepository.create(report);
  }

  async get(id: string): Promise<ReportEntity> {
    const report = await this.reportRepository.findById(id);
    if (!report) {
      throw new Error(`Report with id ${id} not found`);
    }
    return report;
  }

  async listByProject(projectId: string): Promise<ReportEntity[]> {
    return this.reportRepository.findByProject(projectId);
  }

  async listBySuite(suiteId: string): Promise<ReportEntity[]> {
    return this.reportRepository.findBySuite(suiteId);
  }

  async list(): Promise<ReportEntity[]> {
    return this.reportRepository.list();
  }

  async delete(id: string): Promise<void> {
    const existing = await this.reportRepository.findById(id);
    if (!existing) {
      throw new Error(`Report with id ${id} not found`);
    }
    await this.reportRepository.delete(id);
  }
}

export default ManageReports;