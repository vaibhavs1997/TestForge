// TestSuiteRoutes - Route definitions for Test Suite Management
import { Router } from 'express';
import { TestSuiteController } from './TestSuiteController';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository';
import { ManageTestSuites } from '../../application/suite/ManageTestSuites';

// Initialize repository
const testSuiteRepository = new TestSuiteRepository();

// Initialize use case
const manageTestSuites = new ManageTestSuites(testSuiteRepository);

// Initialize controller
const testSuiteController = new TestSuiteController(manageTestSuites);

const router = Router();

// Test Suite routes
router.get('/projects/:projectId/suites', (req, res) => testSuiteController.listSuites(req, res));
router.post('/projects/:projectId/suites', (req, res) => testSuiteController.createSuite(req, res));
router.get('/projects/:projectId/suites/:suiteId', (req, res) => testSuiteController.getSuite(req, res));
router.patch('/projects/:projectId/suites/:suiteId', (req, res) => testSuiteController.updateSuite(req, res));
router.delete('/projects/:projectId/suites/:suiteId', (req, res) => testSuiteController.deleteSuite(req, res));
router.post('/projects/:projectId/suites/:suiteId/execution-plans', (req, res) => testSuiteController.addExecutionPlan(req, res));
router.delete('/projects/:projectId/suites/:suiteId/execution-plans/:executionPlanId', (req, res) => testSuiteController.removeExecutionPlan(req, res));
router.put('/projects/:projectId/suites/:suiteId/execution-plans/reorder', (req, res) => testSuiteController.reorderExecutionPlans(req, res));

export { router as testSuiteRoutes };
export default router;