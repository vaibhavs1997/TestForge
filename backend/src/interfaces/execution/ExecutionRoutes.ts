// ExecutionRoutes - Route definitions for Execution Engine
import { Router } from 'express';
import { ExecutionController } from './ExecutionController';
import { container } from '../../application/ApplicationContainer';
import { asyncHandler } from '../middleware/AsyncHandler';

// Reuse the ExecutePlan instance from ApplicationContainer — it is already
// wired with EventPublisher (Sprint 3 cross-cutting integration).
const {
  executePlan,
  executionRunRepository,
} = container;

// Initialize controller
const executionController = new ExecutionController(
  executePlan,
  executionRunRepository
);

const router = Router();

// Execution routes
router.post('/projects/:projectId/executions/:executionPlanId/start', asyncHandler((req, res) => executionController.startExecution(req, res)));
router.get('/projects/:projectId/executions', asyncHandler((req, res) => executionController.listExecutions(req, res)));
router.get('/projects/:projectId/executions/:runId', asyncHandler((req, res) => executionController.getExecution(req, res)));
router.post('/projects/:projectId/executions/:runId/cancel', asyncHandler((req, res) => executionController.cancelExecution(req, res)));

export { router as executionRoutes };
export default router;