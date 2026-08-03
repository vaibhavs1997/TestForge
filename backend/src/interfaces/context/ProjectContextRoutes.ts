// ProjectContextRoutes - Route definitions for Project Context Builder
import { Router } from 'express';
import { ProjectContextController } from './ProjectContextController';
import { ProjectContextService } from '../../application/context/ProjectContextService';

// Reuse existing repositories (no duplication)
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
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';

// Initialize repositories (reused instances)
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

// Initialize recommendation engine (reused)
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

// Initialize service + controller
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

const projectContextController = new ProjectContextController(projectContextService);

const router = Router();

// Project Context endpoint
router.get('/projects/:projectId/context', (req, res) => projectContextController.getProjectContext(req, res));

export { router as projectContextRoutes };
export default router;