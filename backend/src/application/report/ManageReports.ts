// ManageReports - Application Use Case for Reporting Module
// Handles CRUD operations for reports (create, get, list, delete).
// Report generation is handled by GenerateReport use case.
import { deleteById, requireById } from '../shared/crudHelpers.js';
import { ReportEntity } from '../../domain/report/ReportEntity.js';
import { ReportRepository } from '../../domain/report/ReportRepository.js';

export class ManageReports {
  constructor(private readonly reportRepository: ReportRepository) {}

  async create(report: ReportEntity): Promise<ReportEntity> {
    return this.reportRepository.create(report);
  }

  async get(id: string): Promise<ReportEntity> {
    return requireById(this.reportRepository, id, 'Report');
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
    await deleteById(this.reportRepository, id, 'Report');
  }
}

export default ManageReports;
