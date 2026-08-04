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
import { RunAIPipeline } from '../../application/pipeline/RunAIPipeline';

// Reuse AI infrastructure
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
import { ColumnRepository } from '../../infrastructure/test-data/ColumnRepository';
import { RelationshipRepository } from '../../infrastructure/test-data/RelationshipRepository';
import { BusinessRuleRepository } from '../../infrastructure/knowledge/BusinessRuleRepository';
import { RuntimeVariableRepository } from '../../infrastructure/knowledge/RuntimeVariableRepository';
import { DependencyRepository } from '../../infrastructure/knowledge/DependencyRepository';
import { DocumentationRepository } from '../../infrastructure/knowledge/DocumentationRepository';
import { ReportRepository } from '../../infrastructure/report/ReportRepository';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository';
import ProviderRepository from '../../infrastructure/providers/ProviderRepository';
import VersionRepository from '../../infrastructure/versioning/VersionRepository';
import AuditLogRepository from '../../infrastructure/audit/AuditLogRepository';
import PluginRepository from '../../infrastructure/plugin/PluginRepository';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';

// Reuse AI generation use cases
import { GenerateRequirementsWithAI } from '../../application/requirements/GenerateRequirementsWithAI';
import { GenerateTestStrategyWithAI } from '../../application/requirements/GenerateTestStrategyWithAI';
import { GenerateTestDesignWithAI } from '../../application/requirements/GenerateTestDesignWithAI';
import { GenerateAssertionsWithAI } from '../../application/assertion/GenerateAssertionsWithAI';
import { GenerateExecutionPlanWithAI } from '../../application/requirements/GenerateExecutionPlanWithAI';
import { GenerateTestSuiteWithAI } from '../../application/suite/GenerateTestSuiteWithAI';

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
const columnRepository = new ColumnRepository();
const relationshipRepository = new RelationshipRepository();
const businessRuleRepository = new BusinessRuleRepository();
const runtimeVariableRepository = new RuntimeVariableRepository();
const dependencyRepository = new DependencyRepository();
const documentationRepository = new DocumentationRepository();
const reportRepository = new ReportRepository();
const assertionRepository = new AssertionRepository();
const testSuiteRepository = new TestSuiteRepository();
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

// Reuse AI generation use cases
const generateRequirementsWithAI = new GenerateRequirementsWithAI(
  requirementRepository,
  projectContextService,
  promptBuilderService,
  manageAIProviders,
  versionService
);
const generateTestStrategyWithAI = new GenerateTestStrategyWithAI(
  requirementRepository,
  testStrategyRepository,
  projectContextService,
  promptBuilderService,
  manageAIProviders,
  versionService
);
const generateTestDesignWithAI = new GenerateTestDesignWithAI(
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  projectContextService,
  promptBuilderService,
  manageAIProviders,
  versionService
);
const generateAssertionsWithAI = new GenerateAssertionsWithAI(
  assertionRepository,
  testDesignRepository,
  projectContextService,
  promptBuilderService,
  manageAIProviders,
  versionService
);
const generateExecutionPlanWithAI = new GenerateExecutionPlanWithAI(
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository,
  projectContextService,
  promptBuilderService,
  manageAIProviders,
  versionService
);
const generateTestSuiteWithAI = new GenerateTestSuiteWithAI(
  executionPlanRepository,
  testSuiteRepository,
  projectContextService,
  promptBuilderService,
  manageAIProviders,
  versionService
);

// Initialize orchestrators
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

const runAIPipeline = new RunAIPipeline(
  requirementRepository,
  generateRequirementsWithAI,
  generateTestStrategyWithAI,
  generateTestDesignWithAI,
  generateAssertionsWithAI,
  generateExecutionPlanWithAI,
  generateTestSuiteWithAI
);

// Initialize controller
const pipelineController = new PipelineController(
  orchestratePipeline,
  runAIPipeline
);

const router = Router();

// Pipeline routes
router.post('/projects/:projectId/pipeline', (req, res) => pipelineController.startPipeline(req, res));
router.post('/projects/:projectId/pipeline/ai', (req, res) => pipelineController.runAIPipelineHandler(req, res));
router.get('/projects/:projectId/pipelines', (req, res) => pipelineController.getProjectPipelines(req, res));
router.get('/pipelines/:pipelineId', (req, res) => pipelineController.getPipelineStatus(req, res));
router.post('/pipelines/:pipelineId/restart', (req, res) => pipelineController.restartFailedStage(req, res));
router.post('/pipelines/:pipelineId/cancel', (req, res) => pipelineController.cancelPipeline(req, res));

export { router as pipelineRoutes };
export default router;