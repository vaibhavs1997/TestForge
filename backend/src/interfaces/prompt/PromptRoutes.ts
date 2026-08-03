// PromptRoutes - Route definitions for Prompt Builder module
import { Router } from 'express';
import { PromptController } from './PromptController';
import { PromptBuilderService } from '../../application/prompt/PromptBuilderService';

// Reuse existing repositories (no duplication) - same as ProjectContextRoutes
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
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository';
import ProviderRepository from '../../infrastructure/providers/ProviderRepository';
import VersionRepository from '../../infrastructure/versioning/VersionRepository';
import AuditLogRepository from '../../infrastructure/audit/AuditLogRepository';
import PluginRepository from '../../infrastructure/plugin/PluginRepository';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { ProjectContextService } from '../../application/context/ProjectContextService';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { VersionService } from '../../application/versioning/VersionService';
import { PromptRepository } from '../../infrastructure/prompt/PromptRepository';

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
const executionPlanRepository = new ExecutionPlanRepository();
const assertionRepository = new AssertionRepository();
const testSuiteRepository = new TestSuiteRepository();
const executionProfileRepository = new ExecutionProfileRepository();
const providerRepository = new ProviderRepository();
const versionRepository = new VersionRepository();
const auditLogRepository = new AuditLogRepository();
const pluginRepository = new PluginRepository();
const executionRunRepository = new ExecutionRunRepository();

// Reuse Versioning framework
const versionService = new VersionService(versionRepository);

// Reuse Recommendation Engine (same as ProjectContextRoutes)
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

// Prompt repository
const promptRepository = new PromptRepository();

// Prompt Builder Service
const promptBuilderService = new PromptBuilderService(
  promptRepository,
  projectContextService,
  versionService
);

const promptController = new PromptController(promptBuilderService);

const router = Router();

// Prompt Builder routes
router.get('/projects/:projectId/prompts', (req, res) => promptController.listPrompts(req, res));
router.get('/projects/:projectId/prompts/templates', (req, res) => promptController.listTemplates(req, res));
router.post('/projects/:projectId/prompts/build', (req, res) => promptController.buildPrompt(req, res));
router.post('/projects/:projectId/prompts/preview', (req, res) => promptController.previewPrompt(req, res));
router.get('/projects/:projectId/prompts/:promptId', (req, res) => promptController.getPrompt(req, res));
router.delete('/projects/:projectId/prompts/:promptId', (req, res) => promptController.deletePrompt(req, res));

export { router as promptRoutes };
export default router;
