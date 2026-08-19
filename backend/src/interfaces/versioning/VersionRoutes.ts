// VersionRoutes - Route definitions for Versioning Framework
import { Router } from 'express';
import { VersionController } from './VersionController';
import { container } from '../../application/ApplicationContainer';
import { asyncHandler } from '../middleware/AsyncHandler';

// Reuse shared service from the ApplicationContainer
const { versionService } = container;

// Initialize controller
const versionController = new VersionController(versionService);

export function createVersionRoutes(versionController: VersionController): Router {
  const router = Router();

router.get('/versions/entities/:entityType/:entityId', asyncHandler(versionController.getEntityVersions.bind(versionController)));
router.get('/projects/:projectId/versions', asyncHandler(versionController.listVersions.bind(versionController)));
router.get('/versions/:versionId', asyncHandler(versionController.getVersion.bind(versionController)));
router.get('/versions/compare/:versionId1/:versionId2', asyncHandler(versionController.compareVersions.bind(versionController)));
router.post('/versions/:versionId/restore', asyncHandler(versionController.restoreVersion.bind(versionController)));

  return router;
}

export default createVersionRoutes;
