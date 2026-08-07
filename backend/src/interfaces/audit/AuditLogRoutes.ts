// AuditLogRoutes - Route definitions for Audit Log Framework
import { Router } from 'express';
import { AuditLogController } from './AuditLogController';
import { container } from '../../application/ApplicationContainer';
import { asyncHandler } from '../middleware/AsyncHandler';

// Reuse shared service from the ApplicationContainer
const { auditLogService } = container;

// Initialize controller
const auditLogController = new AuditLogController(auditLogService);

const router = Router();

export function createAuditLogRoutes(auditLogController: AuditLogController): Router {
  const router = Router();

  router.get('/projects/:projectId/audit', asyncHandler(auditLogController.getAuditLogs.bind(auditLogController)));
  router.get('/audit/:logId', asyncHandler(auditLogController.getAuditLog.bind(auditLogController)));

  return router;
}

export default createAuditLogRoutes;
