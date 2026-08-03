// PipelineRoutes - Route definitions for Pipeline Orchestration
import { Router } from 'express';
import { PipelineController } from './PipelineController';
import { PipelineRepositoryImpl } from '../../infrastructure/pipeline/PipelineRepository';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { TestStrategyRepository } from '../../infrastructure/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { OrchestratePipeline } from '../../application/pipeline/OrchestratePipeline';

// Initialize repositories
const pipelineRepository = new PipelineRepositoryImpl();
const requirementRepository = new RequirementRepository();
const analysisRepository = new AnalysisRepository();
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const datasetRepository = new DatasetRepository();
const environmentRepository = new EnvironmentRepository();
const apiServiceRepository = new ApiServiceRepository();
const apiOperationRepository = new ApiOperationRepository();
const testStrategyRepository = new TestStrategyRepository();
const testDesignRepository = new TestDesignRepository();
const executionPlanRepository = new ExecutionPlanRepository();

// Initialize orchestrator
const orchestratePipeline = new OrchestratePipeline(
  pipelineRepository,
  requirementRepository,
  analysisRepository,
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiServiceRepository,
  apiOperationRepository,
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository
);

// Initialize controller
const pipelineController = new PipelineController(orchestratePipeline);

const router = Router();

// Pipeline routes
router.post('/projects/:projectId/pipeline', (req, res) => pipelineController.startPipeline(req, res));
router.get('/projects/:projectId/pipelines', (req, res) => pipelineController.getProjectPipelines(req, res));
router.get('/pipelines/:pipelineId', (req, res) => pipelineController.getPipelineStatus(req, res));
router.post('/pipelines/:pipelineId/restart', (req, res) => pipelineController.restartFailedStage(req, res));
router.post('/pipelines/:pipelineId/cancel', (req, res) => pipelineController.cancelPipeline(req, res));

export { router as pipelineRoutes };
export default router;