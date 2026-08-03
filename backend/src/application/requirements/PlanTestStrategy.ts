// PlanTestStrategy - Deterministic Test Strategy Planner
// Creates the testing strategy for every Approved Requirement.
// Determines WHAT should be tested. Does NOT generate test cases.
// Reuses Requirement, Project Analysis, Knowledge, APIs, and Readiness Report.
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository';
import { TestStrategyEntity, StrategyCategory, StrategyItem, StrategyPriority, StrategyStatus } from '../../domain/requirements/TestStrategyEntity';

interface StrategyPattern {
  category: StrategyCategory;
  titleTemplate: string;
  reasonTemplate: string;
  priority: StrategyPriority;
}

const STRATEGY_PATTERNS: StrategyPattern[] = [
  {
    category: 'Positive',
    titleTemplate: 'Verify {requirement} with valid inputs',
    reasonTemplate: 'Ensure the requirement works correctly under normal conditions.',
    priority: 'High',
  },
  {
    category: 'Negative',
    titleTemplate: 'Verify {requirement} with invalid inputs',
    reasonTemplate: 'Ensure the system handles invalid inputs gracefully.',
    priority: 'High',
  },
  {
    category: 'Boundary',
    titleTemplate: 'Verify {requirement} at boundary values',
    reasonTemplate: 'Ensure edge cases are handled correctly.',
    priority: 'Medium',
  },
  {
    category: 'Business Rules',
    titleTemplate: 'Verify {requirement} enforces business rules',
    reasonTemplate: 'Ensure business logic is correctly applied.',
    priority: 'High',
  },
  {
    category: 'Security',
    titleTemplate: 'Verify {requirement} security controls',
    reasonTemplate: 'Ensure authentication, authorization, and data protection are enforced.',
    priority: 'High',
  },
  {
    category: 'Validation',
    titleTemplate: 'Verify {requirement} input validation',
    reasonTemplate: 'Ensure all inputs are validated correctly.',
    priority: 'Medium',
  },
  {
    category: 'Error Handling',
    titleTemplate: 'Verify {requirement} error handling',
    reasonTemplate: 'Ensure errors are handled gracefully and appropriate messages are returned.',
    priority: 'Medium',
  },
  {
    category: 'Integration',
    titleTemplate: 'Verify {requirement} integration with dependent systems',
    reasonTemplate: 'Ensure integration points work correctly.',
    priority: 'Medium',
  },
  {
    category: 'Regression',
    titleTemplate: 'Verify {requirement} does not break existing functionality',
    reasonTemplate: 'Ensure changes do not introduce regressions.',
    priority: 'Low',
  },
  {
    category: 'Performance',
    titleTemplate: 'Verify {requirement} performance under load',
    reasonTemplate: 'Ensure the requirement performs acceptably under expected load.',
    priority: 'Low',
  },
  {
    category: 'Accessibility',
    titleTemplate: 'Verify {requirement} accessibility',
    reasonTemplate: 'Ensure the requirement is accessible to all users.',
    priority: 'Low',
  },
  {
    category: 'Localization',
    titleTemplate: 'Verify {requirement} localization',
    reasonTemplate: 'Ensure the requirement works across different locales.',
    priority: 'Low',
  },
];

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

    if (requirement.approvalStatus !== 'Approved') {
      throw new Error('Only Approved requirements can have a test strategy');
    }

    // Gather related data
    const analysis = requirement.projectAnalysisId
      ? await this.analysisRepository.findById(requirement.projectAnalysisId)
      : null;

    // Get API operations
    const relatedApis: string[] = [];
    for (const opId of requirement.relatedOperations) {
      const op = await this.apiOperationRepository.findById(opId);
      if (op) {
        relatedApis.push(`${op.method} ${op.path}`);
      }
    }

    // Get related datasets from requirement or analysis
    const relatedData: string[] = [...requirement.relatedDatasets];
    if (analysis) {
      for (const dsId of analysis.relatedDatasets) {
        if (!relatedData.includes(dsId)) {
          relatedData.push(dsId);
        }
      }
    }

    // Generate strategy sections based on requirement category and readiness
    const sections = STRATEGY_PATTERNS.map((pattern) => {
      const title = pattern.titleTemplate.replace('{requirement}', requirement.title);
      const reason = pattern.reasonTemplate;

      const item: StrategyItem = {
        id: crypto.randomUUID(),
        title,
        reason,
        relatedApis: [...relatedApis],
        relatedData: [...relatedData],
        priority: pattern.priority,
        status: 'Enabled',
      };

      return {
        category: pattern.category,
        items: [item],
      };
    });

    const now = Date.now();
    const strategy = new TestStrategyEntity(
      crypto.randomUUID(),
      requirementId,
      requirement.projectId,
      sections,
      now,
      now
    );

    return this.testStrategyRepository.create(strategy);
  }
}

export default PlanTestStrategy;