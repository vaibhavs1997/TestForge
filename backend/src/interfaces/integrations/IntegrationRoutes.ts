import { Router } from 'express';
import { IntegrationsController } from './IntegrationsController.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const integrationsController = new IntegrationsController();
const router = Router();

router.get('/integrations/jira/status', asyncHandler((req, res) => integrationsController.getJiraStatus(req, res)));

export { router as integrationRoutes };
export default router;
