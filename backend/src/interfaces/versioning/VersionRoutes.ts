// VersionRoutes - Route definitions for Versioning Framework
import { Router } from 'express';
import { VersionController } from './VersionController.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { authorizeResource } from '../middleware/auth.js';

export function createVersionRoutes(versionController: VersionController): Router {
  const router = Router();

router.get('/versions/entities/:entityType/:entityId', asyncHandler(versionController.getEntityVersions.bind(versionController)));
router.get('/projects/:projectId/versions', asyncHandler(versionController.listVersions.bind(versionController)));
const authorizeVersion = authorizeResource('versionId', versionController.findForAuthorization.bind(versionController));
router.get('/versions/:versionId', authorizeVersion, asyncHandler(versionController.getVersion.bind(versionController)));
router.get('/versions/compare/:versionId1/:versionId2', authorizeResource('versionId1', versionController.findForAuthorization.bind(versionController)), authorizeResource('versionId2', versionController.findForAuthorization.bind(versionController)), asyncHandler(versionController.compareVersions.bind(versionController)));
router.post('/versions/:versionId/restore', authorizeVersion, asyncHandler(versionController.restoreVersion.bind(versionController)));

  return router;
}

export default createVersionRoutes;
