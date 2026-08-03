// ReportController - Controller for Reporting Module endpoints
import { Request, Response } from 'express';
import { GenerateReport } from '../../application/report/GenerateReport';
import { ManageReports } from '../../application/report/ManageReports';

export class ReportController {
  constructor(
    private readonly generateReportUseCase: GenerateReport,
    private readonly manageReportsUseCase: ManageReports
  ) {}

  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, executionRunId } = req.params;
      const { suiteId } = req.body;

      const report = await this.generateReportUseCase.generate(executionRunId, suiteId);
      res.status(201).json({ success: true, data: report });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('must be completed')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const report = await this.manageReportsUseCase.get(reportId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async listReports(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { suiteId } = req.query;

      let reports;
      if (suiteId) {
        reports = await this.manageReportsUseCase.listBySuite(suiteId as string);
      } else if (projectId) {
        reports = await this.manageReportsUseCase.listByProject(projectId);
      } else {
        reports = await this.manageReportsUseCase.list();
      }

      res.status(200).json({ success: true, data: reports });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      await this.manageReportsUseCase.delete(reportId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default ReportController;