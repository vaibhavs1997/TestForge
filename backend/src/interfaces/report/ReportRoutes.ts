// ReportRoutes - Route definitions for Reporting Module
import { Router } from 'express';
import { ReportController } from './ReportController.js';
import { PublishReportToJira } from '../../application/report/PublishReportToJira.js';
import { container } from '../../application/ApplicationContainer.js';

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
import { GenerateReport } from '../../application/report/GenerateReport.js';
import { ManageReports } from '../../application/report/ManageReports.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const generateReport = new GenerateReport(
  reportRepository,
  executionRunRepository,
  environmentRepository,
  recommendationEngine,
  eventPublisher
);

const manageReports = new ManageReports(reportRepository);

const publishReportToJira = new PublishReportToJira(reportRepository, requirementRepository);

// Initialize controller
const reportController = new ReportController(generateReport, manageReports, publishReportToJira);

const router = Router();

// Report routes
router.post('/projects/:projectId/reports/generate/:executionRunId', asyncHandler((req, res) => reportController.generateReport(req, res)));
router.get('/projects/:projectId/reports', asyncHandler((req, res) => reportController.listReports(req, res)));
router.get('/projects/:projectId/reports/:reportId', asyncHandler((req, res) => reportController.getReport(req, res)));
router.delete('/projects/:projectId/reports/:reportId', asyncHandler((req, res) => reportController.deleteReport(req, res)));
router.post('/projects/:projectId/reports/:reportId/publish-jira', asyncHandler((req, res) => reportController.publishToJira(req, res)));

export { router as reportRoutes };
export default router;