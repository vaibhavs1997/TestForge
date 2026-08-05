// AuditLogController - Controller for Audit Log Module endpoints
import { Request, Response } from 'express';
import { AuditLogService } from '../../application/audit/AuditLogService';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

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

      res.status(200).json(createSuccessResponse(logs));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getAuditLog(req: Request, res: Response): Promise<void> {
    try {
      const { logId } = req.params;
      const log = await this.auditLogService.getLogById(logId);
      res.status(200).json(createSuccessResponse(log));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default AuditLogController;