// ReportController - Controller for Reporting Module endpoints
import { Request, Response } from 'express';
import { GenerateReport } from '../../application/report/GenerateReport';
import { ManageReports } from '../../application/report/ManageReports';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class ReportController {
    constructor(private readonly generateReportUseCase: GenerateReport, private readonly manageReportsUseCase: ManageReports) { }
    async generateReport(req: Request, res: Response): Promise<void> {
        const { projectId, executionRunId } = req.params;
        const { suiteId } = req.body;
        const report = await this.generateReportUseCase.generate(executionRunId, suiteId);
        res.status(201).json(createSuccessResponse(report));
    }
    async getReport(req: Request, res: Response): Promise<void> {
        const { reportId } = req.params;
        const report = await this.manageReportsUseCase.get(reportId);
        res.status(200).json(createSuccessResponse(report));
    }
    async listReports(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { suiteId } = req.query;
        let reports;
        if (suiteId) {
            reports = await this.manageReportsUseCase.listBySuite(suiteId as string);
        }
        else if (projectId) {
            reports = await this.manageReportsUseCase.listByProject(projectId);
        }
        else {
            reports = await this.manageReportsUseCase.list();
        }
        res.status(200).json(createSuccessResponse(reports));
    }
    async deleteReport(req: Request, res: Response): Promise<void> {
        const { reportId } = req.params;
        await this.manageReportsUseCase.delete(reportId);
        res.status(204).send();
    }
}
export default ReportController;

