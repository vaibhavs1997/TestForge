// ReportController - Controller for Reporting Module endpoints
import { Request, Response } from 'express';
import { GenerateReport } from '../../application/report/GenerateReport';
import { ManageReports } from '../../application/report/ManageReports';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

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
      res.status(201).json(createSuccessResponse(report));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('must be completed')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const report = await this.manageReportsUseCase.get(reportId);
      res.status(200).json(createSuccessResponse(report));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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

      res.status(200).json(createSuccessResponse(reports));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async deleteReport(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      await this.manageReportsUseCase.delete(reportId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }
}

export default ReportController;