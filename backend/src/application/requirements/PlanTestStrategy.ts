// PlanTestStrategy - Deterministic Test Strategy Planner
// Creates the testing strategy for every Approved Requirement.
// Determines WHAT should be tested. Does NOT generate test cases.
// Reuses Requirement, Project Analysis, Knowledge, APIs, and Readiness Report.
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository.js';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository.js';
import { TestStrategyEntity, StrategyCategorySection, StrategyItem } from '../../domain/requirements/TestStrategyEntity.js';
import { rankOperationsForRequirement } from './RequirementOperationMatcher.js';
import { planScenariosFromAcceptanceCriteria } from './acceptanceCriteriaScenarios.js';

export class PlanTestStrategy {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly testStrategyRepository: TestStrategyRepository
  ) {}

  async execute(requirementId: string): Promise<TestStrategyEntity> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${requirementId} not found`);
    }

    if (requirement.approvalStatus === 'Rejected' || requirement.approvalStatus === 'Archived') {
      throw new Error('Cannot plan strategy for rejected or archived requirements');
    }

    const existing = await this.testStrategyRepository.findByRequirement(requirementId);
    if (existing) {
      return existing;
    }

    const operations = await this.apiOperationRepository.findByProject(requirement.projectId);
    const rankedIds = rankOperationsForRequirement(requirement, operations).map((o) => o.id);
    const topOperation = rankedIds.length > 0 ? operations.find((o) => o.id === rankedIds[0]) : undefined;
    const apiBodyKeys =
      topOperation?.sampleRequestBody && typeof topOperation.sampleRequestBody === 'object'
        ? Object.keys(topOperation.sampleRequestBody)
        : undefined;
    const apiRequiredBodyKeys =
      topOperation?.requiredRequestBodyFields && topOperation.requiredRequestBodyFields.length > 0
        ? topOperation.requiredRequestBodyFields
        : undefined;

    const planned = planScenariosFromAcceptanceCriteria(requirement, {
      apiRequiredBodyKeys,
      apiBodyKeys,
    });
    const matchedOpIds =
      rankedIds.length > 0
        ? rankedIds.slice(0, 5)
        : requirement.relatedOperations.length > 0
          ? requirement.relatedOperations
          : [];

    const analysis = requirement.projectAnalysisId
      ? await this.analysisRepository.findById(requirement.projectAnalysisId)
      : null;

    const relatedApis: string[] = [...matchedOpIds];
    for (const opId of requirement.relatedOperations) {
      if (!relatedApis.includes(opId)) relatedApis.push(opId);
    }

    const relatedData: string[] = [...requirement.relatedDatasets];
    if (analysis) {
      for (const dsId of analysis.relatedDatasets) {
        if (!relatedData.includes(dsId)) {
          relatedData.push(dsId);
        }
      }
    }

    const sectionMap = new Map<string, StrategyCategorySection>();

    const scenarioOrdinals = new Map<string, number>();
    for (const scenario of planned) {
      const acceptanceCriterionId = scenario.acceptanceCriterionId
        ?? this.resolveAcceptanceCriterionId(requirement, scenario.title, scenario.reason);
      const identityBase = acceptanceCriterionId || 'legacy';
      const ordinal = scenarioOrdinals.get(identityBase) || 0;
      scenarioOrdinals.set(identityBase, ordinal + 1);
      const item: StrategyItem = {
        id: randomUUID(),
        title: scenario.title,
        reason: scenario.reason,
        relatedApis: [...relatedApis],
        relatedData: [...relatedData],
        priority: scenario.priority,
        status: 'Enabled',
        expectedHttpStatus: scenario.expectedHttpStatus,
        testCaseType: scenario.testCaseType,
        focusFieldId: scenario.focusFieldId,
        scenarioKind: scenario.scenarioKind,
        acceptanceCriterionId,
        scenarioId: `${identityBase}:scenario:${ordinal}`,
      };

      const existingSection = sectionMap.get(scenario.category);
      if (existingSection) {
        existingSection.items.push(item);
      } else {
        sectionMap.set(scenario.category, {
          category: scenario.category,
          items: [item],
        });
      }
    }

    const sections = [...sectionMap.values()];

    const now = Date.now();
    const strategy = new TestStrategyEntity(
      randomUUID(),
      requirementId,
      requirement.projectId,
      sections,
      now,
      now
    );

    return this.testStrategyRepository.create(strategy);
  }

  private resolveAcceptanceCriterionId(requirement: any, title: string, reason: string): string | undefined {
    const criteria = requirement.acceptanceCriteria || [];
    if (criteria.length === 0) return undefined;
    const text = `${title} ${reason}`.toLowerCase();
    const tokens = text.split(/[^a-z0-9]+/).filter((token: string) => token.length > 2);
    let best = criteria[0];
    let bestScore = -1;
    for (const criterion of criteria) {
      const criterionTokens = new Set(String(criterion.text || '').toLowerCase().split(/[^a-z0-9]+/).filter((token: string) => token.length > 2));
      const score = tokens.reduce((sum: number, token: string) => sum + (criterionTokens.has(token) ? 1 : 0), 0);
      if (score > bestScore) { best = criterion; bestScore = score; }
    }
    return best?.id;
  }
}

export default PlanTestStrategy;
