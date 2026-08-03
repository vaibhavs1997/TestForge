// AuditLogRoutes - Route definitions for Audit Log Module
import { Router } from 'express';
import { AuditLogController } from './AuditLogController';

export function createAuditLogRoutes(auditLogController: AuditLogController): Router {
  const router = Router();

  router.get('/projects/:projectId/audit', auditLogController.getAuditLogs.bind(auditLogController));
  router.get('/audit/:logId', auditLogController.getAuditLog.bind(auditLogController));

  return router;
}

export default createAuditLogRoutes;