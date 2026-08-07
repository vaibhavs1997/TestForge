// ReportRoutes - Route definitions for Reporting Module
import { Router } from 'express';
import { ReportController } from './ReportController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repositories and services from the ApplicationContainer
const {
  reportRepository,
  executionRunRepository,
  environmentRepository,
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository,
  knowledgeFlowRepository,
  datasetRepository,
  apiOperationRepository,
  recommendationEngine,
  eventPublisher,
} = container;

// Initialize use cases
import { GenerateReport } from '../../application/report/GenerateReport';
import { ManageReports } from '../../application/report/ManageReports';
import { asyncHandler } from '../middleware/AsyncHandler';

const generateReport = new GenerateReport(
  reportRepository,
  executionRunRepository,
  environmentRepository,
  recommendationEngine,
  eventPublisher
);

const manageReports = new ManageReports(reportRepository);

// Initialize controller
const reportController = new ReportController(generateReport, manageReports);

const router = Router();

// Report routes
router.post('/projects/:projectId/reports/generate/:executionRunId', asyncHandler((req, res) => reportController.generateReport(req, res)));
router.get('/projects/:projectId/reports', asyncHandler((req, res) => reportController.listReports(req, res)));
router.get('/projects/:projectId/reports/:reportId', asyncHandler((req, res) => reportController.getReport(req, res)));
router.delete('/projects/:projectId/reports/:reportId', asyncHandler((req, res) => reportController.deleteReport(req, res)));

export { router as reportRoutes };
export default router;