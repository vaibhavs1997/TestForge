// ProjectContextRoutes - Route definitions for Project Context Builder
import { Router } from 'express';
import { ProjectContextController } from './ProjectContextController';
import { container } from '../../application/ApplicationContainer';
import { asyncHandler } from '../middleware/AsyncHandler';

// Reuse shared service from the ApplicationContainer
const { projectContextService } = container;

const projectContextController = new ProjectContextController(projectContextService);

const router = Router();

// Project Context endpoint
router.get('/projects/:projectId/context', asyncHandler((req, res) => projectContextController.getProjectContext(req, res)));

export { router as projectContextRoutes };
export default router;