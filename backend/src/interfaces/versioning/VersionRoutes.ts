// VersionRoutes - Route definitions for Versioning Framework
import { Router } from 'express';
import { VersionController } from './VersionController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared service from the ApplicationContainer
const { versionService } = container;

// Initialize controller
const versionController = new VersionController(versionService);

export function createVersionRoutes(versionController: VersionController): Router {
  const router = Router();

router.get('/versions/entities/:entityType/:entityId', versionController.getEntityVersions.bind(versionController));
router.post('/versions/:versionId/restore', versionController.restoreVersion.bind(versionController));

  return router;
}

export default createVersionRoutes;