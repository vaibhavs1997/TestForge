// VersionRoutes - Route definitions for Versioning Module
import { Router } from 'express';
import { VersionController } from './VersionController';

export function createVersionRoutes(versionController: VersionController): Router {
  const router = Router();

  router.get('/projects/:projectId/versions', versionController.listVersions.bind(versionController));
  router.get('/projects/:projectId/versions/:entityType/:entityId', versionController.getEntityVersions.bind(versionController));
  router.get('/versions/:versionId', versionController.getVersion.bind(versionController));
  router.post('/projects/:projectId/versions/:versionId/restore', versionController.restoreVersion.bind(versionController));
  router.get('/projects/:projectId/versions/compare/:versionId1/:versionId2', versionController.compareVersions.bind(versionController));

  return router;
}

export default createVersionRoutes;