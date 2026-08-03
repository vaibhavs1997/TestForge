// AuditLogController - Controller for Audit Log Module endpoints
import { Request, Response } from 'express';
import { AuditLogService } from '../../application/audit/AuditLogService';

export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { module, entityType, entityId, action, startDate, endDate } = req.query;

      const logs = await this.auditLogService.getLogs(projectId, {
        module: module as string | undefined,
        entityType: entityType as string | undefined,
        entityId: entityId as string | undefined,
        action: action as string | undefined,
        startDate: startDate ? Number(startDate) : undefined,
        endDate: endDate ? Number(endDate) : undefined,
      });

      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { logId } = req.params;
      const log = await this.auditLogService.getLogById(logId);
      res.status(200).json({ success: true, data: log });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default AuditLogController;