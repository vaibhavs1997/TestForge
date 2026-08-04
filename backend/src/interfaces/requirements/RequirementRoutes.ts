// RequirementRoutes - Route definitions for Requirement Workspace
import { Router } from 'express';
import { RequirementController } from './RequirementController';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { CreateRequirement } from '../../application/requirements/CreateRequirement';
import { UpdateRequirement } from '../../application/requirements/UpdateRequirement';
import { DeleteRequirement } from '../../application/requirements/DeleteRequirement';
import { GetRequirement } from '../../application/requirements/GetRequirement';
import { ListRequirements } from '../../application/requirements/ListRequirements';
import { GenerateFromAnalysis } from '../../application/requirements/GenerateFromAnalysis';
import { ValidateRequirementReadiness } from '../../application/requirements/ValidateRequirementReadiness';
import { PlanTestStrategy } from '../../application/requirements/PlanTestStrategy';
import { GenerateTestDesigns } from '../../application/requirements/GenerateTestDesigns';
import { PlanExecution } from '../../application/requirements/PlanExecution';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { TestStrategyRepository } from '../../infrastructure/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { VersionService } from '../../application/versioning/VersionService';
import { InMemoryVersionRepository } from '../../infrastructure/versioning/VersionRepository';
import { AIRequirementController } from './AIRequirementController';
import { GenerateRequirementsWithAI } from '../../application/requirements/GenerateRequirementsWithAI';
import { GenerateTestStrategyWithAI } from '../../application/requirements/GenerateTestStrategyWithAI';
import { GenerateTestDesignWithAI } from '../../application/requirements/GenerateTestDesignWithAI';
import { GenerateExecutionPlanWithAI } from '../../application/requirements/GenerateExecutionPlanWithAI';
import { GenerateAssertionsWithAI } from '../../application/assertion/GenerateAssertionsWithAI';
import { ProjectContextService } from '../../application/context/ProjectContextService';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { PromptBuilderService } from '../../application/prompt/PromptBuilderService';
import { PromptRepository } from '../../infrastructure/prompt/PromptRepository';
import { ManageAIProviders } from '../../application/ai-provider/ManageAIProviders';
import { AIProviderRegistry } from '../../application/ai-provider/AIProviderRegistry';
import { AIProviderResolutionService } from '../../application/ai-provider/AIProviderResolutionService';
import { InMemoryAIProviderRepository } from '../../infrastructure/ai-provider/AIProviderRepository';
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

// Initialize repositories
const versionRepository = new InMemoryVersionRepository();
const versionService = new VersionService(versionRepository);
const requirementRepository = new RequirementRepository(versionService);
const analysisRepository = new AnalysisRepository();
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const datasetRepository = new DatasetRepository();
const environmentRepository = new EnvironmentRepository();
const apiServiceRepository = new ApiServiceRepository();
const apiOperationRepository = new ApiOperationRepository();
const testStrategyRepository = new TestStrategyRepository();
const testDesignRepository = new TestDesignRepository();
const executionPlanRepository = new ExecutionPlanRepository();

// Reuse AI Provider Framework (AI Orchestrator)
const aiProviderRepository = new InMemoryAIProviderRepository();
const aiProviderRegistry = new AIProviderRegistry();
const aiProviderResolutionService = new AIProviderResolutionService(aiProviderRegistry);
const manageAIProviders = new ManageAIProviders(
  aiProviderRepository,
  aiProviderRegistry,
  aiProviderResolutionService
);

// Reuse Project Context Builder
const recommendationEngine = new RecommendationEngine(
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository,
  new ExecutionRunRepository(),
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiOperationRepository
);

const projectContextService = new ProjectContextService(
  apiServiceRepository,
  apiOperationRepository,
  environmentRepository,
  datasetRepository,
  new ColumnRepository(),
  new RelationshipRepository(),
  knowledgeFlowRepository,
  new BusinessRuleRepository(),
  new RuntimeVariableRepository(),
  new DependencyRepository(),
  new DocumentationRepository(),
  analysisRepository,
  requirementRepository,
  new ReportRepository(),
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository,
  new AssertionRepository(),
  new TestSuiteRepository(),
  new ExecutionProfileRepository(),
  new ProviderRepository(),
  new VersionRepository(),
  new AuditLogRepository(),
  new PluginRepository(),
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
const createRequirement = new CreateRequirement(requirementRepository);
const updateRequirement = new UpdateRequirement(requirementRepository);
const deleteRequirement = new DeleteRequirement(requirementRepository);
const getRequirement = new GetRequirement(requirementRepository);
const listRequirements = new ListRequirements(requirementRepository);
const generateFromAnalysis = new GenerateFromAnalysis(requirementRepository, analysisRepository);
const validateRequirementReadiness = new ValidateRequirementReadiness(
  requirementRepository,
  analysisRepository,
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiServiceRepository,
  apiOperationRepository
);

const planTestStrategy = new PlanTestStrategy(
  requirementRepository,
  analysisRepository,
  knowledgeFlowRepository,
  apiOperationRepository,
  testStrategyRepository
);

const generateTestDesigns = new GenerateTestDesigns(
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  analysisRepository,
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiOperationRepository
);

const planExecution = new PlanExecution(
  requirementRepository,
  testDesignRepository,
  executionPlanRepository,
  knowledgeFlowRepository,
  apiOperationRepository
);

// Initialize AI requirement generation
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
  new AssertionRepository(),
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
const aiRequirementController = new AIRequirementController(
  generateRequirementsWithAI,
  generateTestStrategyWithAI,
  generateTestDesignWithAI,
  generateAssertionsWithAI,
  generateExecutionPlanWithAI
);

// Initialize controller
const requirementController = new RequirementController(
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  generateFromAnalysis,
  validateRequirementReadiness,
  planTestStrategy,
  generateTestDesigns,
  planExecution
);

const router = Router();

// Requirement routes
router.get('/projects/:projectId/requirements', (req, res) => requirementController.listRequirements(req, res));
router.post('/projects/:projectId/requirements', (req, res) => requirementController.createRequirement(req, res));
router.get('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.getRequirement(req, res));
router.patch('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.updateRequirement(req, res));
router.delete('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.deleteRequirement(req, res));
router.post('/projects/:projectId/requirements/generate-ai', (req, res) => aiRequirementController.generateWithAI(req, res));
router.post('/projects/:projectId/requirements/:requirementId/strategy-ai', (req, res) => aiRequirementController.generateStrategyWithAI(req, res));
router.post('/projects/:projectId/requirements/:requirementId/designs-ai', (req, res) => aiRequirementController.generateDesignWithAI(req, res));
router.post('/projects/:projectId/requirements/:requirementId/execution-plans-ai', (req, res) => aiRequirementController.generateExecutionPlanAI(req, res));
router.post('/projects/:projectId/test-designs/:testDesignId/assertions-ai', (req, res) => aiRequirementController.generateAssertionsWithAI(req, res));
router.post('/projects/:projectId/requirements/from-analysis/:analysisId', (req, res) => requirementController.generateFromAnalysis(req, res));
router.get('/projects/:projectId/requirements/:requirementId/validate', (req, res) => requirementController.validateReadiness(req, res));
router.post('/projects/:projectId/requirements/:requirementId/strategy', (req, res) => requirementController.planTestStrategy(req, res));
router.post('/projects/:projectId/requirements/:requirementId/designs', (req, res) => requirementController.generateTestDesigns(req, res));
router.post('/projects/:projectId/requirements/:requirementId/execution-plans', (req, res) => requirementController.planExecution(req, res));

export { router as requirementRoutes };
export default router;