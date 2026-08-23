// AuditLogController - Controller for Audit Log Module endpoints
import { Request, Response } from 'express';
import { AuditLogService } from '../../application/audit/AuditLogService.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
import { assertProjectAccess } from '../middleware/auth.js';
export class AuditLogController {
    constructor(private readonly auditLogService: AuditLogService) { }
    async getAuditLogs(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        await assertProjectAccess(projectId, req.auth);
        const { module, entityType, entityId, action, startDate, endDate } = req.query;
        const logs = await this.auditLogService.getLogs(projectId, {
            module: module as string | undefined,
            entityType: entityType as string | undefined,
            entityId: entityId as string | undefined,
            action: action as string | undefined,
            startDate: startDate ? Number(startDate) : undefined,
            endDate: endDate ? Number(endDate) : undefined,
        });
        res.status(200).json(createSuccessResponse(logs));
    }
    async getAuditLog(req: Request, res: Response): Promise<void> {
        const { logId } = req.params;
        const log = await this.auditLogService.getLogById(logId);
        await assertProjectAccess(log.projectId, req.auth);
        res.status(200).json(createSuccessResponse(log));
    }
    async findForAuthorization(logId: string): Promise<{ projectId: string } | null> {
        try {
            const log = await this.auditLogService.getLogById(logId);
            return { projectId: log.projectId };
        } catch {
            return null;
        }
    }
}
export default AuditLogController;

