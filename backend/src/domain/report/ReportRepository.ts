// ReportRepository - Domain Repository Interface for Reporting Module
import { ReportEntity } from './ReportEntity';

export interface ReportRepository {
  create(report: ReportEntity): Promise<ReportEntity>;
  findById(id: string): Promise<ReportEntity | null>;
  findByProject(projectId: string): Promise<ReportEntity[]>;
  findByExecutionRun(executionRunId: string): Promise<ReportEntity | null>;
  findBySuite(suiteId: string): Promise<ReportEntity[]>;
  list(): Promise<ReportEntity[]>;
  delete(id: string): Promise<void>;
}

export default ReportRepository;