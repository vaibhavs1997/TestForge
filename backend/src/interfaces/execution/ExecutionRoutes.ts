// ExecutionRoutes - Route definitions for Execution Engine
import { Router } from 'express';
import { ExecutionController } from './ExecutionController';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { ExecutePlan } from '../../application/execution/ExecutePlan';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';

// Initialize repositories
const executionRunRepository = new ExecutionRunRepository();
const executionPlanRepository = new ExecutionPlanRepository();
const requirementRepository = new RequirementRepository();
const environmentRepository = new EnvironmentRepository();
const datasetRepository = new DatasetRepository();
const apiOperationRepository = new ApiOperationRepository();

// Initialize use case
const executePlan = new ExecutePlan(
  executionRunRepository,
  executionPlanRepository,
  requirementRepository,
  environmentRepository,
  datasetRepository,
  apiOperationRepository
);

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