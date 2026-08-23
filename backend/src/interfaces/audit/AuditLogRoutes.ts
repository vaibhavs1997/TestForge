// AuditLogRoutes - Route definitions for Audit Log Framework
import { Router } from 'express';
import { AuditLogController } from './AuditLogController.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { authorizeResource } from '../middleware/auth.js';

export function createAuditLogRoutes(auditLogController: AuditLogController): Router {
  const router = Router();

  router.get('/projects/:projectId/audit', asyncHandler(auditLogController.getAuditLogs.bind(auditLogController)));
  router.get('/audit/:logId', authorizeResource('logId', auditLogController.findForAuthorization.bind(auditLogController)), asyncHandler(auditLogController.getAuditLog.bind(auditLogController)));

  return router;
}

export default createAuditLogRoutes;
