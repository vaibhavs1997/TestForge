// Execution Profile Routes
import { Router } from 'express';
import { ExecutionProfileController } from './ExecutionProfileController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repository from the ApplicationContainer
const { executionProfileRepository } = container;

// Initialize use case
import { ManageExecutionProfiles } from '../../application/execution/ManageExecutionProfiles';
import { asyncHandler } from '../middleware/AsyncHandler';

const manageProfiles = new ManageExecutionProfiles(executionProfileRepository);

// Initialize controller
const profileController = new ExecutionProfileController(manageProfiles);

const router = Router();

// Execution profile routes
router.get('/projects/:projectId/execution-profiles', asyncHandler((req, res) => profileController.listByProject(req, res)));
router.get('/projects/:projectId/execution-profiles/default', asyncHandler((req, res) => profileController.getDefault(req, res)));
router.get('/projects/:projectId/execution-profiles/:profileId', asyncHandler((req, res) => profileController.getById(req, res)));
router.post('/projects/:projectId/execution-profiles', asyncHandler((req, res) => profileController.create(req, res)));
router.patch('/projects/:projectId/execution-profiles/:profileId', asyncHandler((req, res) => profileController.update(req, res)));
router.delete('/projects/:projectId/execution-profiles/:profileId', asyncHandler((req, res) => profileController.delete(req, res)));
router.post('/projects/:projectId/execution-profiles/:profileId/duplicate', asyncHandler((req, res) => profileController.duplicate(req, res)));

export { router as executionProfileRoutes };
export default router;