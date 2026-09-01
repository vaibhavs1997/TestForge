// TestSuiteRoutes - Route definitions for Test Suite Management
import { Router } from 'express';
import { TestSuiteController } from './TestSuiteController.js';
import { ManageTestSuites } from '../../application/suite/ManageTestSuites.js';
import { container } from '../../application/ApplicationContainer.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { ExecuteSuite } from '../../application/suite/ExecuteSuite.js';

// Reuse shared use cases from the ApplicationContainer
const {
  testSuiteRepository,
  generateTestSuiteWithAI,
  executePlan,
  executeSuite,
  executionPlanRepository,
  executionProfileRepository,
  requirementRepository,
  environmentRepository,
  testDesignRepository,
} = container;

// Initialize use cases
const manageTestSuites = new ManageTestSuites(testSuiteRepository);

// Initialize controller
const testSuiteController = new TestSuiteController(
  manageTestSuites,
  generateTestSuiteWithAI,
  executeSuite,
  executionPlanRepository,
  executionProfileRepository,
  requirementRepository,
  executePlan,
  environmentRepository,
  testDesignRepository,
);

const router = Router();

// Test Suite routes
router.get('/projects/:projectId/suites', asyncHandler((req, res) => testSuiteController.listSuites(req, res)));
router.get('/projects/:projectId/execution/suites', asyncHandler((req, res) => testSuiteController.listRunnableSuites(req, res)));
router.post('/projects/:projectId/execution/suites/:suiteId/execute', asyncHandler((req, res) => testSuiteController.executeApprovedSuite(req, res)));
router.post('/projects/:projectId/suites', asyncHandler((req, res) => testSuiteController.createSuite(req, res)));
router.get('/projects/:projectId/suites/:suiteId', asyncHandler((req, res) => testSuiteController.getSuite(req, res)));
router.patch('/projects/:projectId/suites/:suiteId', asyncHandler((req, res) => testSuiteController.updateSuite(req, res)));
router.delete('/projects/:projectId/suites/:suiteId', asyncHandler((req, res) => testSuiteController.deleteSuite(req, res)));
router.post('/projects/:projectId/suites/:suiteId/execution-plans', asyncHandler((req, res) => testSuiteController.addExecutionPlan(req, res)));
router.post('/projects/:projectId/suites/:suiteId/execute', asyncHandler((req, res) => testSuiteController.execute(req, res)));
router.delete('/projects/:projectId/suites/:suiteId/execution-plans/:executionPlanId', asyncHandler((req, res) => testSuiteController.removeExecutionPlan(req, res)));
router.put('/projects/:projectId/suites/:suiteId/execution-plans/reorder', asyncHandler((req, res) => testSuiteController.reorderExecutionPlans(req, res)));
router.post('/projects/:projectId/suites/generate-ai', asyncHandler((req, res) => testSuiteController.generateWithAI(req, res)));

export { router as testSuiteRoutes };
export default router;
