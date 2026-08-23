// ProjectContextService - Aggregates all project knowledge into one deterministic object.
// Reuses every existing repository. Does NOT duplicate repository logic.
// Does NOT implement LLM, prompt generation, or test generation.

import {
  ProjectContextEntity,
  ProjectContextStatistics,
  ValidationWarning,
  ProjectSummary,
} from '../../domain/context/ProjectContextEntity.js';

// Infrastructure repositories (reused - not duplicated)
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository.js';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository.js';
import { ColumnRepository } from '../../infrastructure/test-data/ColumnRepository.js';
import { RelationshipRepository } from '../../infrastructure/test-data/RelationshipRepository.js';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository.js';
import { BusinessRuleRepository } from '../../infrastructure/knowledge/BusinessRuleRepository.js';
import { RuntimeVariableRepository } from '../../infrastructure/knowledge/RuntimeVariableRepository.js';
import { DependencyRepository } from '../../infrastructure/knowledge/DependencyRepository.js';
import { DocumentationRepository } from '../../infrastructure/knowledge/DocumentationRepository.js';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository.js';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository.js';
import { ReportRepository } from '../../infrastructure/report/ReportRepository.js';
import { TestStrategyRepository } from '../../infrastructure/requirements/TestStrategyRepository.js';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository.js';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository.js';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository.js';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository.js';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository.js';
import ProviderRepository from '../../infrastructure/providers/ProviderRepository.js';
import VersionRepository from '../../infrastructure/versioning/VersionRepository.js';
import type { AuditLogRepository } from '../../domain/audit/index.js';
import PluginRepository from '../../infrastructure/plugin/PluginRepository.js';
import { RecommendationEngine } from '../recommendation/RecommendationEngine.js';

export class ProjectContextService {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly columnRepository: ColumnRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly businessRuleRepository: BusinessRuleRepository,
    private readonly runtimeVariableRepository: RuntimeVariableRepository,
    private readonly dependencyRepository: DependencyRepository,
    private readonly documentationRepository: DocumentationRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly requirementRepository: RequirementRepository,
    private readonly reportRepository: ReportRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly assertionRepository: AssertionRepository,
    private readonly testSuiteRepository: TestSuiteRepository,
    private readonly executionProfileRepository: ExecutionProfileRepository,
    private readonly providerRepository: ProviderRepository,
    private readonly versionRepository: VersionRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly pluginRepository: PluginRepository,
    private readonly recommendationEngine: RecommendationEngine
  ) {}

  /**
   * Build the complete, normalized project context object.
   * This is the single deterministic input for every future AI feature.
   */
  async buildContext(projectId: string): Promise<ProjectContextEntity> {
    // 1. APIs + API Operations (operations are stored per-service)
    const apis = await this.apiServiceRepository.findByProject(projectId);
    const apiOperations = await this.collectApiOperations(apis);

    // 2. Environments
    const environments = await this.environmentRepository.findByProject(projectId);

    // 3. Datasets + Columns + Relationships
    const datasets = await this.datasetRepository.findByProject(projectId);
    const datasetColumns = await this.collectDatasetColumns(datasets);
    const datasetRelationships = await this.relationshipRepository.listByProject(projectId);

    // 4. Knowledge
    const knowledgeFlows = await this.knowledgeFlowRepository.findByProject(projectId);
    const businessRules = await this.businessRuleRepository.findByProject(projectId);
    const runtimeVariables = await this.runtimeVariableRepository.findByProject(projectId);
    const dependencies = await this.dependencyRepository.findByProject(projectId);
    const documentation = await this.documentationRepository.findByProject(projectId);

    // 5. Analysis
    const analysis = await this.analysisRepository.findByProject(projectId);

    // 6. Requirements
    const requirements = await this.requirementRepository.findByProject(projectId);

    // 7. Readiness Reports
    const readinessReports = await this.reportRepository.findByProject(projectId);

    // 8. Test Strategies + Designs + Execution Plans
    const testStrategies = await this.testStrategyRepository.findByProject(projectId);
    const testDesigns = await this.testDesignRepository.findByProject(projectId);
    const executionPlans = await this.executionPlanRepository.findByProject(projectId);

    // 9. Assertions
    const assertions = await this.assertionRepository.findByProject(projectId);

    // 10. Suites
    const suites = await this.testSuiteRepository.findByProject(projectId);

    // 11. Execution Profiles
    const executionProfiles = await this.executionProfileRepository.listByProject(projectId);

    // 12. Providers
    const providers = await this.providerRepository.findByProject(projectId);

    // 13. Recommendations (generated deterministically on-the-fly)
    const recommendations = await this.recommendationEngine.analyzeProject(projectId);

    // 14. Versions
    const versions = await this.versionRepository.findByProject(projectId);

    // 15. Audit Summary
    const auditSummary = await this.auditLogRepository.findByProject(projectId);

    // 16. Plugins
    const plugins = await this.pluginRepository.findByProject(projectId);

    // Project summary (project module is a stub; derive minimal summary)
    const project: ProjectSummary = {
      id: projectId,
      name: `Project ${projectId}`,
      description: '',
      status: 'active',
    };

    const statistics = this.computeStatistics({
      apis: apis.length,
      apiOperations: apiOperations.length,
      environments: environments.length,
      datasets: datasets.length,
      datasetColumns: datasetColumns.length,
      datasetRelationships: datasetRelationships.length,
      knowledgeFlows: knowledgeFlows.length,
      businessRules: businessRules.length,
      runtimeVariables: runtimeVariables.length,
      dependencies: dependencies.length,
      documentation: documentation.length,
      analysis: analysis.length,
      requirements: requirements.length,
      readinessReports: readinessReports.length,
      testStrategies: testStrategies.length,
      testDesigns: testDesigns.length,
      executionPlans: executionPlans.length,
      assertions: assertions.length,
      suites: suites.length,
      executionProfiles: executionProfiles.length,
      providers: providers.length,
      recommendations: recommendations.length,
      versions: versions.length,
      auditEntries: auditSummary.length,
      plugins: plugins.length,
    });

    const validationWarnings = this.computeValidationWarnings({
      apis,
      apiOperations,
      environments,
      datasets,
      datasetColumns,
      knowledgeFlows,
      businessRules,
      runtimeVariables,
      dependencies,
      documentation,
      requirements,
      testStrategies,
      testDesigns,
      executionPlans,
      assertions,
      executionProfiles,
      recommendations,
    });

    return {
      projectId,
      generatedAt: Date.now(),
      project,
      apis,
      apiOperations,
      environments,
      datasets,
      datasetColumns,
      datasetRelationships,
      knowledgeFlows,
      businessRules,
      runtimeVariables,
      dependencies,
      documentation,
      analysis,
      requirements,
      readinessReports,
      testStrategies,
      testDesigns,
      executionPlans,
      assertions,
      suites,
      executionProfiles,
      providers,
      recommendations,
      versions,
      auditSummary,
      plugins,
      statistics,
      validationWarnings,
    };
  }

  /**
   * Collect API operations across all services belonging to the project.
   * Operations are stored per-service, so we iterate services.
   */
  private async collectApiOperations(apis: any[]): Promise<any[]> {
    const operations: any[] = [];
    for (const api of apis) {
      try {
        const ops = await this.apiOperationRepository.findByService(api.id);
        operations.push(...ops);
      } catch {
        // tolerate missing service directory
      }
    }
    return operations;
  }

  /**
   * Collect dataset columns across all datasets belonging to the project.
   * Columns are retrieved per-dataset.
   */
  private async collectDatasetColumns(datasets: any[]): Promise<any[]> {
    const columns: any[] = [];
    for (const dataset of datasets) {
      try {
        const cols = await this.columnRepository.findByDataset(dataset.id);
        columns.push(...cols);
      } catch {
        // tolerate missing dataset
      }
    }
    return columns;
  }

  private computeStatistics(counts: Omit<ProjectContextStatistics, 'totalEntities'>): ProjectContextStatistics {
    const totalEntities =
      counts.apis +
      counts.apiOperations +
      counts.environments +
      counts.datasets +
      counts.datasetColumns +
      counts.datasetRelationships +
      counts.knowledgeFlows +
      counts.businessRules +
      counts.runtimeVariables +
      counts.dependencies +
      counts.documentation +
      counts.analysis +
      counts.requirements +
      counts.readinessReports +
      counts.testStrategies +
      counts.testDesigns +
      counts.executionPlans +
      counts.assertions +
      counts.suites +
      counts.executionProfiles +
      counts.providers +
      counts.recommendations +
      counts.versions +
      counts.auditEntries +
      counts.plugins;

    return { ...counts, totalEntities };
  }

  private computeValidationWarnings(ctx: {
    apis: any[];
    apiOperations: any[];
    environments: any[];
    datasets: any[];
    datasetColumns: any[];
    knowledgeFlows: any[];
    businessRules: any[];
    runtimeVariables: any[];
    dependencies: any[];
    documentation: any[];
    requirements: any[];
    testStrategies: any[];
    testDesigns: any[];
    executionPlans: any[];
    assertions: any[];
    executionProfiles: any[];
    recommendations: any[];
  }): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    if (ctx.apis.length > 0 && ctx.apiOperations.length === 0) {
      warnings.push({
        code: 'NO_API_OPERATIONS',
        message: `${ctx.apis.length} API service(s) defined but no operations found.`,
        severity: 'Medium',
        section: 'APIs',
      });
    }

    if (ctx.environments.length === 0) {
      warnings.push({
        code: 'NO_ENVIRONMENTS',
        message: 'No environments configured for this project.',
        severity: 'High',
        section: 'Environments',
      });
    }

    if (ctx.datasets.length > 0 && ctx.datasetColumns.length === 0) {
      warnings.push({
        code: 'NO_DATASET_COLUMNS',
        message: `${ctx.datasets.length} dataset(s) defined but no columns found.`,
        severity: 'Medium',
        section: 'Datasets',
      });
    }

    if (ctx.requirements.length > 0 && ctx.testDesigns.length === 0) {
      warnings.push({
        code: 'NO_TEST_DESIGNS',
        message: `${ctx.requirements.length} requirement(s) defined but no test designs found.`,
        severity: 'High',
        section: 'Test Designs',
      });
    }

    if (ctx.testDesigns.length > 0 && ctx.executionPlans.length === 0) {
      warnings.push({
        code: 'NO_EXECUTION_PLANS',
        message: `${ctx.testDesigns.length} test design(s) defined but no execution plans found.`,
        severity: 'High',
        section: 'Execution Plans',
      });
    }

    if (ctx.testDesigns.length > 0 && ctx.assertions.length === 0) {
      warnings.push({
        code: 'NO_ASSERTIONS',
        message: 'Test designs exist but no assertions are defined.',
        severity: 'Medium',
        section: 'Assertions',
      });
    }

    if (ctx.executionPlans.length > 0 && ctx.executionProfiles.length === 0) {
      warnings.push({
        code: 'NO_EXECUTION_PROFILES',
        message: 'Execution plans exist but no execution profiles are configured.',
        severity: 'Medium',
        section: 'Execution Profiles',
      });
    }

    if (ctx.requirements.length > 0 && ctx.knowledgeFlows.length === 0) {
      warnings.push({
        code: 'NO_KNOWLEDGE_FLOWS',
        message: 'Requirements exist but no knowledge flows are documented.',
        severity: 'Low',
        section: 'Knowledge Flows',
      });
    }

    if (ctx.requirements.length > 0 && ctx.businessRules.length === 0) {
      warnings.push({
        code: 'NO_BUSINESS_RULES',
        message: 'Requirements exist but no business rules are documented.',
        severity: 'Low',
        section: 'Business Rules',
      });
    }

    if (ctx.recommendations.length > 0) {
      const highPriority = ctx.recommendations.filter((r: any) => r.priority === 'High');
      if (highPriority.length > 0) {
        warnings.push({
          code: 'HIGH_PRIORITY_RECOMMENDATIONS',
          message: `${highPriority.length} high-priority recommendation(s) require attention.`,
          severity: 'High',
          section: 'Recommendations',
        });
      }
    }

    return warnings;
  }
}

export default ProjectContextService;