// PlanTestStrategy - Deterministic Test Strategy Planner
// Creates the testing strategy for every Approved Requirement.
// Determines WHAT should be tested. Does NOT generate test cases.
// Uses requirement acceptance criteria only. Execution context is added later.
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository.js';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository.js';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository.js';
import { TestStrategyEntity, StrategyCategorySection, StrategyItem } from '../../domain/requirements/TestStrategyEntity.js';
import { planScenariosFromAcceptanceCriteria } from './acceptanceCriteriaScenarios.js';

export class PlanTestStrategy {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    // Kept in the constructor for compatibility with the composition root.
    // Strategy planning intentionally must not read an API contract: acceptance
    // criteria alone define which scenarios exist.
    private readonly _apiOperationRepository: any,
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

    const planned = planScenariosFromAcceptanceCriteria(requirement);

    // Associations are enrichment data and must not influence scenario
    // generation. They are populated by independent later phases.
    const relatedApis: string[] = [];
    const relatedData: string[] = [];

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
