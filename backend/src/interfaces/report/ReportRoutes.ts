// ReportRoutes - Route definitions for Reporting Module
import { Router } from 'express';
import { ReportController } from './ReportController';
import { ReportRepository } from '../../infrastructure/report/ReportRepository';
import { GenerateReport } from '../../application/report/GenerateReport';
import { ManageReports } from '../../application/report/ManageReports';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { TestStrategyRepository } from '../../infrastructure/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { EventBus } from '../../domain/events/EventBus';

// Initialize repositories
const reportRepository = new ReportRepository();
const executionRunRepository = new ExecutionRunRepository();
const environmentRepository = new EnvironmentRepository();
const requirementRepository = new RequirementRepository();
const testStrategyRepository = new TestStrategyRepository();
const testDesignRepository = new TestDesignRepository();
const executionPlanRepository = new ExecutionPlanRepository();
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const datasetRepository = new DatasetRepository();
const apiOperationRepository = new ApiOperationRepository();

// Initialize recommendation engine (reused, not duplicated)
const recommendationEngine = new RecommendationEngine(
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository,
  executionRunRepository,
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiOperationRepository
);

// Initialize use cases
const eventBus = new EventBus();
const generateReport = new GenerateReport(
  reportRepository,
  executionRunRepository,
  environmentRepository,
  recommendationEngine,
  eventBus
);

const manageReports = new ManageReports(reportRepository);

// Initialize controller
const reportController = new ReportController(generateReport, manageReports);

const router = Router();

// Report routes
router.post('/projects/:projectId/reports/generate/:executionRunId', (req, res) => reportController.generateReport(req, res));
router.get('/projects/:projectId/reports', (req, res) => reportController.listReports(req, res));
router.get('/projects/:projectId/reports/:reportId', (req, res) => reportController.getReport(req, res));
router.delete('/projects/:projectId/reports/:reportId', (req, res) => reportController.deleteReport(req, res));

export { router as reportRoutes };
export default router;