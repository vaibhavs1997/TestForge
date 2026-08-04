// TestSuiteRoutes - Route definitions for Test Suite Management
import { Router } from 'express';
import { TestSuiteController } from './TestSuiteController';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository';
import { ManageTestSuites } from '../../application/suite/ManageTestSuites';
import { GenerateTestSuiteWithAI } from '../../application/suite/GenerateTestSuiteWithAI';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { ProjectContextService } from '../../application/context/ProjectContextService';
import { PromptBuilderService } from '../../application/prompt/PromptBuilderService';
import { ManageAIProviders } from '../../application/ai-provider/ManageAIProviders';
import { AIProviderRegistry } from '../../application/ai-provider/AIProviderRegistry';
import { AIProviderResolutionService } from '../../application/ai-provider/AIProviderResolutionService';
import { InMemoryAIProviderRepository } from '../../infrastructure/ai-provider/AIProviderRepository';
import { VersionService } from '../../application/versioning/VersionService';
import { InMemoryVersionRepository } from '../../infrastructure/versioning/VersionRepository';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { PromptRepository } from '../../infrastructure/prompt/PromptRepository';

// Reuse context repositories
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { ColumnRepository } from '../../infrastructure/test-data/ColumnRepository';
import { RelationshipRepository } from '../../infrastructure/test-data/RelationshipRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { BusinessRuleRepository } from '../../infrastructure/knowledge/BusinessRuleRepository';
import { RuntimeVariableRepository } from '../../infrastructure/knowledge/RuntimeVariableRepository';
import { DependencyRepository } from '../../infrastructure/knowledge/DependencyRepository';
import { DocumentationRepository } from '../../infrastructure/knowledge/DocumentationRepository';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { ReportRepository } from '../../infrastructure/report/ReportRepository';
import { TestStrategyRepository } from '../../infrastructure/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository';
import ProviderRepository from '../../infrastructure/providers/ProviderRepository';
import VersionRepository from '../../infrastructure/versioning/VersionRepository';
import AuditLogRepository from '../../infrastructure/audit/AuditLogRepository';
import PluginRepository from '../../infrastructure/plugin/PluginRepository';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';

// Initialize repositories
const testSuiteRepository = new TestSuiteRepository();
const executionPlanRepository = new ExecutionPlanRepository();

// Reuse AI Provider Framework
const aiProviderRepository = new InMemoryAIProviderRepository();
const aiProviderRegistry = new AIProviderRegistry();
const aiProviderResolutionService = new AIProviderResolutionService(aiProviderRegistry);
const manageAIProviders = new ManageAIProviders(
  aiProviderRepository,
  aiProviderRegistry,
  aiProviderResolutionService
);

// Reuse Versioning framework
const versionService = new VersionService(new InMemoryVersionRepository());

// Reuse context repositories
const apiServiceRepository = new ApiServiceRepository();
const apiOperationRepository = new ApiOperationRepository();
const environmentRepository = new EnvironmentRepository();
const datasetRepository = new DatasetRepository();
const columnRepository = new ColumnRepository();
const relationshipRepository = new RelationshipRepository();
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const businessRuleRepository = new BusinessRuleRepository();
const runtimeVariableRepository = new RuntimeVariableRepository();
const dependencyRepository = new DependencyRepository();
const documentationRepository = new DocumentationRepository();
const analysisRepository = new AnalysisRepository();
const requirementRepository = new RequirementRepository();
const reportRepository = new ReportRepository();
const testStrategyRepository = new TestStrategyRepository();
const testDesignRepository = new TestDesignRepository();
const assertionRepository = new AssertionRepository();
const executionProfileRepository = new ExecutionProfileRepository();
const providerRepository = new ProviderRepository();
const versionRepository = new VersionRepository();
const auditLogRepository = new AuditLogRepository();
const pluginRepository = new PluginRepository();
const executionRunRepository = new ExecutionRunRepository();

// Reuse Recommendation Engine
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

// Reuse ProjectContextService
const projectContextService = new ProjectContextService(
  apiServiceRepository,
  apiOperationRepository,
  environmentRepository,
  datasetRepository,
  columnRepository,
  relationshipRepository,
  knowledgeFlowRepository,
  businessRuleRepository,
  runtimeVariableRepository,
  dependencyRepository,
  documentationRepository,
  analysisRepository,
  requirementRepository,
  reportRepository,
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository,
  assertionRepository,
  testSuiteRepository,
  executionProfileRepository,
  providerRepository,
  versionRepository,
  auditLogRepository,
  pluginRepository,
  recommendationEngine
);

// Reuse Prompt Builder
const promptRepository = new PromptRepository();
const promptBuilderService = new PromptBuilderService(
  promptRepository,
  projectContextService,
  versionService
);

// Initialize use cases
const manageTestSuites = new ManageTestSuites(testSuiteRepository);
const generateTestSuiteWithAI = new GenerateTestSuiteWithAI(
  executionPlanRepository,
  testSuiteRepository,
  projectContextService,
  promptBuilderService,
  manageAIProviders,
  versionService
);

// Initialize controller
const testSuiteController = new TestSuiteController(
  manageTestSuites,
  generateTestSuiteWithAI
);

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
router.post('/projects/:projectId/suites/generate-ai', (req, res) => testSuiteController.generateWithAI(req, res));

export { router as testSuiteRoutes };
export default router;