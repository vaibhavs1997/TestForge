// RecommendationRoutes - Route definitions for Recommendation Engine
import { Router } from 'express';
import { RecommendationController } from './RecommendationController';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { TestStrategyRepository } from '../../infrastructure/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';

// Initialize repositories
const requirementRepository = new RequirementRepository();
const testStrategyRepository = new TestStrategyRepository();
const testDesignRepository = new TestDesignRepository();
const executionPlanRepository = new ExecutionPlanRepository();
const executionRunRepository = new ExecutionRunRepository();
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const datasetRepository = new DatasetRepository();
const environmentRepository = new EnvironmentRepository();
const apiOperationRepository = new ApiOperationRepository();

// Initialize use case
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

// Initialize controller
const recommendationController = new RecommendationController(
  recommendationEngine
);

const router = Router();

// Recommendation routes
router.get('/projects/:projectId/analyze', (req, res) => recommendationController.analyzeProject(req, res));

export { router as recommendationRoutes };
export default router;
