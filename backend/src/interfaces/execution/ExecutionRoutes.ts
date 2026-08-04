// ExecutionRoutes - Route definitions for Execution Engine
import { Router } from 'express';
import { ExecutionController } from './ExecutionController';
import { container } from '../../application/ApplicationContainer';

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
router.post('/projects/:projectId/executions/:executionPlanId/start', (req, res) => executionController.startExecution(req, res));
router.get('/projects/:projectId/executions', (req, res) => executionController.listExecutions(req, res));
router.get('/projects/:projectId/executions/:runId', (req, res) => executionController.getExecution(req, res));
router.post('/projects/:projectId/executions/:runId/cancel', (req, res) => executionController.cancelExecution(req, res));

export { router as executionRoutes };
export default router;