// ExecutionRoutes - Route definitions for Execution Engine
import { Router } from 'express';
import { ExecutionController } from './ExecutionController';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { ExecutePlan } from '../../application/execution/ExecutePlan';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { DataSourceMappingRepository } from '../../infrastructure/test-data/DataSourceMappingRepository';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository';

// Initialize repositories
const executionRunRepository = new ExecutionRunRepository();
const executionPlanRepository = new ExecutionPlanRepository();
const requirementRepository = new RequirementRepository();
const testDesignRepository = new TestDesignRepository();
const environmentRepository = new EnvironmentRepository();
const datasetRepository = new DatasetRepository();
const dataSourceMappingRepository = new DataSourceMappingRepository();
const datasetRowRepository = new DatasetRowRepository();
const apiOperationRepository = new ApiOperationRepository();
const assertionRepository = new AssertionRepository();
const executionProfileRepository = new ExecutionProfileRepository();

// Initialize use case
const executePlan = new ExecutePlan(
  executionRunRepository,
  executionPlanRepository,
  requirementRepository,
  environmentRepository,
  datasetRepository,
  apiOperationRepository,
  dataSourceMappingRepository,
  datasetRowRepository,
  testDesignRepository,
  assertionRepository,
  executionProfileRepository
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