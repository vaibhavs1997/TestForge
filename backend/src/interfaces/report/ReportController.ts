// ReportController - Controller for Reporting Module endpoints
import { Request, Response } from 'express';
import { GenerateReport } from '../../application/report/GenerateReport.js';
import { ManageReports } from '../../application/report/ManageReports.js';
import { PublishReportToJira } from '../../application/report/PublishReportToJira.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
import { assertProjectAccess } from '../middleware/auth.js';
import { getAuthConfig } from '../../config.js';
import type { ReportEntity } from '../../domain/report/ReportEntity.js';
export class ReportController {
    constructor(
        private readonly generateReportUseCase: GenerateReport,
        private readonly manageReportsUseCase: ManageReports,
        private readonly publishReportToJiraUseCase: PublishReportToJira,
    ) { }
    async generateReport(req: Request, res: Response): Promise<void> {
        const { projectId, executionRunId } = req.params;
        await assertProjectAccess(projectId, req.auth);
        const { suiteId } = req.body;
        const report = await this.generateReportUseCase.generate(executionRunId, suiteId);
        res.status(201).json(createSuccessResponse(report));
    }
    async getReport(req: Request, res: Response): Promise<void> {
        const { reportId } = req.params;
        const report = await this.manageReportsUseCase.get(reportId);
        await assertProjectAccess(report.projectId, req.auth);
        res.status(200).json(createSuccessResponse(report));
    }
    async listReports(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { suiteId } = req.query;
        let reports: ReportEntity[];
        if (projectId) await assertProjectAccess(projectId, req.auth);
        if (!projectId && getAuthConfig().enabled && req.auth?.projectIds !== '*') {
            reports = [];
        } else if (suiteId) {
            reports = (await this.manageReportsUseCase.listBySuite(suiteId as string))
                .filter((report) => !projectId || report.projectId === projectId);
        }
        else if (projectId) {
            reports = await this.manageReportsUseCase.listByProject(projectId);
        }
        else {
            if (req.auth?.projectIds !== '*') {
                reports = [];
            } else {
                reports = await this.manageReportsUseCase.list();
            }
        }
        res.status(200).json(createSuccessResponse(reports));
    }
    async deleteReport(req: Request, res: Response): Promise<void> {
        const { reportId } = req.params;
        const report = await this.manageReportsUseCase.get(reportId);
        await assertProjectAccess(report.projectId, req.auth);
        await this.manageReportsUseCase.delete(reportId);
        res.status(204).send();
    }
    async publishToJira(req: Request, res: Response): Promise<void> {
        const { reportId } = req.params;
        const report = await this.manageReportsUseCase.get(reportId);
        await assertProjectAccess(report.projectId, req.auth);
        const { issueKey } = req.body as { issueKey?: string };
        const result = await this.publishReportToJiraUseCase.execute({ reportId, issueKey });
        res.status(200).json(createSuccessResponse(result));
    }
}
export default ReportController;

