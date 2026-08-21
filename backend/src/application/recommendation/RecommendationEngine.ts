// RecommendationEngine - Analyzes project state and generates deterministic recommendations
// Does NOT execute APIs or generate reports. Does NOT use AI/LLM.
import { Recommendation, RecommendationCategory, RecommendationPriority } from '../../domain/recommendation/RecommendationEntity.js';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository.js';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository.js';
import { ExecutionRunRepository } from '../../domain/execution/ExecutionRunRepository.js';
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository.js';
import { DatasetRepository } from '../../domain/test-data/DatasetRepository.js';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository.js';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';

export interface ProjectAnalysisContext {
  projectId: string;
  requirements: any[];
  strategies: any[];
  designs: any[];
  executionPlans: any[];
  executionRuns: any[];
  validationRuns: any[];
  knowledgeFlows: any[];
  datasets: any[];
  environments: any[];
  apiOperations: any[];
}

export class RecommendationEngine {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly executionRunRepository: ExecutionRunRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly apiOperationRepository: ApiOperationRepository
  ) {}

  async analyzeProject(projectId: string): Promise<Recommendation[]> {
    const context = await this.buildAnalysisContext(projectId);
    const recommendations: Recommendation[] = [];

    // Run all deterministic analysis rules
    recommendations.push(...this.checkMissingTestData(context));
    recommendations.push(...this.checkMissingEnvironment(context));
    recommendations.push(...this.checkMissingRuntimeVariables(context));
    recommendations.push(...this.checkWeakAssertions(context));
    recommendations.push(...this.checkMissingNegativeTests(context));
    recommendations.push(...this.checkMissingSecurityTests(context));
    recommendations.push(...this.checkMissingBoundaryTests(context));
    recommendations.push(...this.checkMissingBusinessRules(context));
    recommendations.push(...this.checkUnusedAPIs(context));
    recommendations.push(...this.checkUnmappedDatasets(context));
    recommendations.push(...this.checkMissingKnowledgeFlows(context));
    recommendations.push(...this.checkMissingDependencies(context));

    return recommendations;
  }

  private async buildAnalysisContext(projectId: string): Promise<ProjectAnalysisContext> {
    const [requirements, strategies, designs, executionPlans, executionRuns, knowledgeFlows, datasets, environments, apiOperations] = await Promise.all([
      this.requirementRepository.findByProject(projectId),
      this.testStrategyRepository.findByProject(projectId),
      this.testDesignRepository.findByProject(projectId),
      this.executionPlanRepository.findByProject(projectId),
      this.executionRunRepository.findByProject(projectId),
      this.knowledgeFlowRepository.findByProject(projectId),
      this.datasetRepository.findByProject(projectId),
      this.environmentRepository.findByProject(projectId),
      this.apiOperationRepository.list(),
    ]);

    return {
      projectId,
      requirements,
      strategies,
      designs,
      executionPlans,
      executionRuns,
      validationRuns: [],
      knowledgeFlows,
      datasets,
      environments,
      apiOperations: apiOperations.filter((api: any) => api.serviceId === projectId),
    };
  }

  private checkMissingTestData(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const designsWithoutDataset = context.designs.filter((d: any) => !d.datasetId);

    if (designsWithoutDataset.length > 0 && context.datasets.length === 0) {
      recommendations.push({
        id: `rec-${Date.now()}-1`,
        projectId: context.projectId,
        category: 'Missing Test Data',
        priority: 'High',
        title: 'No test datasets configured',
        reason: `${designsWithoutDataset.length} design(s) require test data but no datasets exist in the project.`,
        suggestedAction: 'Create test datasets and map them to execution plans.',
        affectedRequirementIds: [...new Set(designsWithoutDataset.map((d: any) => d.requirementId))],
        affectedApiOperationIds: [...new Set(designsWithoutDataset.map((d: any) => d.operationId))],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingEnvironment(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (context.environments.length === 0 && context.executionPlans.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-2`,
        projectId: context.projectId,
        category: 'Missing Environment',
        priority: 'High',
        title: 'No environments configured',
        reason: `${context.executionPlans.length} execution plan(s) exist but no environments are configured.`,
        suggestedAction: 'Create at least one environment (e.g., Development, Staging, Production).',
        affectedRequirementIds: [...new Set(context.executionPlans.map((p: any) => p.requirementId))],
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingRuntimeVariables(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const plansWithBindings = context.executionPlans.filter((p: any) => p.runtimeBindings && p.runtimeBindings.length > 0);

    if (plansWithBindings.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-3`,
        projectId: context.projectId,
        category: 'Missing Runtime Variable',
        priority: 'Medium',
        title: 'Runtime variable bindings may not be initialized',
        reason: `${plansWithBindings.length} execution plan(s) use runtime variable bindings. Ensure variables are captured from prior steps.`,
        suggestedAction: 'Verify runtime variable capture order and initialization in execution plan.',
        affectedRequirementIds: [...new Set(plansWithBindings.map((p: any) => p.requirementId))],
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkWeakAssertions(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const weakDesigns = context.designs.filter((d: any) => {
      return d.assertions && d.assertions.length === 0;
    });

    if (weakDesigns.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-4`,
        projectId: context.projectId,
        category: 'Weak Assertions',
        priority: 'High',
        title: 'Test designs without assertions',
        reason: `${weakDesigns.length} test design(s) have no assertions defined, reducing test coverage value.`,
        suggestedAction: 'Add assertions (status, body, header, jsonPath) to test designs.',
        affectedRequirementIds: [...new Set(weakDesigns.map((d: any) => d.requirementId))],
        affectedApiOperationIds: [...new Set(weakDesigns.map((d: any) => d.operationId))],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingNegativeTests(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const hasNegative = context.strategies.some((s: any) => s.type === 'negative' || s.type === 'Negative');

    if (!hasNegative && context.strategies.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-5`,
        projectId: context.projectId,
        category: 'Missing Negative Tests',
        priority: 'High',
        title: 'No negative test strategies found',
        reason: 'No negative test scenarios exist in the project. Negative testing validates error handling.',
        suggestedAction: 'Generate Negative Strategy for requirements to cover error cases.',
        affectedRequirementIds: context.requirements.map((r: any) => r.id),
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingSecurityTests(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const hasSecurity = context.strategies.some((s: any) => 
      s.type === 'security' || s.tags?.includes('security') || s.tags?.includes('Security')
    );

    if (!hasSecurity && context.requirements.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-6`,
        projectId: context.projectId,
        category: 'Missing Security Tests',
        priority: 'High',
        title: 'No security test strategies found',
        reason: 'No security test scenarios exist. Security testing validates authentication, authorization, and data protection.',
        suggestedAction: 'Generate Security Strategy to cover authentication and authorization scenarios.',
        affectedRequirementIds: context.requirements.map((r: any) => r.id),
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingBoundaryTests(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const hasBoundary = context.strategies.some((s: any) => 
      s.type === 'boundary' || s.tags?.includes('boundary') || s.tags?.includes('Boundary')
    );

    if (!hasBoundary && context.requirements.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-7`,
        projectId: context.projectId,
        category: 'Missing Boundary Tests',
        priority: 'Medium',
        title: 'No boundary test strategies found',
        reason: 'No boundary value analysis exists. Boundary testing validates edge cases and limits.',
        suggestedAction: 'Generate Boundary Strategy to cover edge cases and input limits.',
        affectedRequirementIds: context.requirements.map((r: any) => r.id),
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingBusinessRules(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const uncoveredRequirements = context.requirements.filter((r: any) => {
      const hasDesign = context.designs.some((d: any) => d.requirementId === r.id);
      return !hasDesign;
    });

    if (uncoveredRequirements.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-8`,
        projectId: context.projectId,
        category: 'Missing Business Rules',
        priority: 'High',
        title: 'Requirements without test designs',
        reason: `${uncoveredRequirements.length} requirement(s) have no associated test designs.`,
        suggestedAction: 'Generate test designs for uncovered requirements.',
        affectedRequirementIds: uncoveredRequirements.map((r: any) => r.id),
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkUnusedAPIs(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const usedOperationIds = new Set(context.designs.map((d: any) => d.operationId));
    const unusedAPIs = context.apiOperations.filter((api: any) => !usedOperationIds.has(api.id));

    if (unusedAPIs.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-9`,
        projectId: context.projectId,
        category: 'Unused APIs',
        priority: 'Low',
        title: 'API operations not covered by tests',
        reason: `${unusedAPIs.length} API operation(s) are not referenced in any test design.`,
        suggestedAction: 'Consider adding test designs for uncovered APIs or mark them as out of scope.',
        affectedRequirementIds: [],
        affectedApiOperationIds: unusedAPIs.map((api: any) => api.id),
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkUnmappedDatasets(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const usedDatasetIds = new Set(context.designs.map((d: any) => d.datasetId).filter(Boolean));
    const unmappedDatasets = context.datasets.filter((ds: any) => !usedDatasetIds.has(ds.id));

    if (unmappedDatasets.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-10`,
        projectId: context.projectId,
        category: 'Unmapped Datasets',
        priority: 'Low',
        title: 'Datasets not mapped to test designs',
        reason: `${unmappedDatasets.length} dataset(s) are not mapped to any test design.`,
        suggestedAction: 'Map datasets to test designs or remove unused datasets.',
        affectedRequirementIds: [],
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingKnowledgeFlows(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (context.knowledgeFlows.length === 0 && context.requirements.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-11`,
        projectId: context.projectId,
        category: 'Missing Knowledge Flows',
        priority: 'Medium',
        title: 'No knowledge flows documented',
        reason: 'No business flows are documented. Knowledge flows help understand system behavior.',
        suggestedAction: 'Create knowledge flows to document business processes.',
        affectedRequirementIds: context.requirements.map((r: any) => r.id),
        affectedApiOperationIds: [],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }

  private checkMissingDependencies(context: ProjectAnalysisContext): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const plansWithPrereqs = context.executionPlans.filter((p: any) => p.prerequisiteDesignIds && p.prerequisiteDesignIds.length > 0);
    const designsWithoutPlans = context.designs.filter((d: any) => {
      return !context.executionPlans.some((p: any) => p.testDesignId === d.id);
    });

    if (designsWithoutPlans.length > 0) {
      recommendations.push({
        id: `rec-${Date.now()}-12`,
        projectId: context.projectId,
        category: 'Missing Dependencies',
        priority: 'Medium',
        title: 'Test designs without execution plans',
        reason: `${designsWithoutPlans.length} test design(s) are not linked to any execution plan.`,
        suggestedAction: 'Create execution plans for test designs or archive unused designs.',
        affectedRequirementIds: [...new Set(designsWithoutPlans.map((d: any) => d.requirementId))],
        affectedApiOperationIds: [...new Set(designsWithoutPlans.map((d: any) => d.operationId))],
        status: 'Pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return recommendations;
  }
}