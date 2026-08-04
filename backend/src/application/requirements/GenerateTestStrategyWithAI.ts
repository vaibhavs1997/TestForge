// GenerateTestStrategyWithAI - Application Use Case
// Generates Test Strategy entities using the AI Provider Framework.
// Reuses: ProjectContextService, PromptBuilderService, ManageAIProviders (AI Orchestrator),
// RequirementRepository, TestStrategyRepository, VersionService.
// Does NOT implement any new framework. Relies on deterministic placeholder AI responses
// and structured JSON parsing with graceful fallbacks.

import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import {
  TestStrategyEntity,
  StrategyCategory,
  StrategyItem,
  StrategyPriority,
  StrategyStatus,
  StrategyCategorySection,
} from '../../domain/requirements/TestStrategyEntity';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository';
import { ProjectContextService } from '../context/ProjectContextService';
import { PromptBuilderService } from '../prompt/PromptBuilderService';
import { ManageAIProviders } from '../ai-provider/ManageAIProviders';
import { VersionService } from '../versioning/VersionService';
import { EventPublisher } from '../EventPublisher';
import type { AIProviderMessage } from '../../domain/ai-provider';

export interface GenerateTestStrategyWithAIRequest {
  projectId: string;
  requirementId: string;
  providerId: string;
  previewOnly?: boolean;
}

export interface GeneratedStrategyItemInput {
  title: string;
  reason: string;
  relatedApis?: string[];
  relatedData?: string[];
  priority?: StrategyPriority;
  status?: StrategyStatus;
}

export interface TestStrategyGenerationResult {
  strategy: TestStrategyEntity | null;
  preview?: {
    contextSummary: Record<string, any>;
    generatedPrompt: {
      systemPrompt: string;
      userPrompt: string;
      tokenEstimate: number;
      validationWarnings: string[];
    };
    tokenEstimate: number;
    costEstimate: number;
  };
  warnings: string[];
  providerUsed: {
    id: string;
    name: string;
    provider: string;
    model: string;
  };
}

const TEST_STRATEGY_TEMPLATE_ID = 'tmpl-strategy-001';

const DEFAULT_SECTIONS: StrategyCategory[] = [
  'Positive',
  'Negative',
  'Boundary',
  'Business Rules',
  'Security',
  'Validation',
  'Error Handling',
  'Integration',
  'Regression',
  'Performance',
  'Accessibility',
  'Localization',
];

export class GenerateTestStrategyWithAI {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly manageAIProviders: ManageAIProviders,
    private readonly versionService: VersionService,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(request: GenerateTestStrategyWithAIRequest): Promise<TestStrategyGenerationResult> {
    const warnings: string[] = [];

    // ---------------------------------------------------------------------
    // Validate the requirement exists
    // ---------------------------------------------------------------------
    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${request.requirementId} not found`);
    }

    // Determine projectId from request (fall back to requirement's projectId)
    const projectId = request.projectId || requirement.projectId;

    // ---------------------------------------------------------------------
    // 1. Build Project Context
    // ---------------------------------------------------------------------
    let context: any = null;
    try {
      context = await this.projectContextService.buildContext(projectId);
    } catch (err: any) {
      warnings.push(`Project context could not be built: ${err.message}`);
    }

    if (!context) {
      warnings.push('No project context was available for strategy generation.');
    }

    // ---------------------------------------------------------------------
    // 2. Resolve selected AI Provider
    // ---------------------------------------------------------------------
    let providerEntity;
    try {
      providerEntity = await this.manageAIProviders.getProvider(request.providerId);
    } catch (err: any) {
      throw new Error(`AI Provider could not be resolved: ${err.message}`);
    }

    if (!providerEntity.enabled) {
      warnings.push(`AI Provider "${providerEntity.name}" is disabled. Using placeholder strategy generation.`);
    }

    // ---------------------------------------------------------------------
    // 3. Build Prompt using the existing Test Strategy template
    // ---------------------------------------------------------------------
    let builtPrompt: {
      systemPrompt: string;
      userPrompt: string;
      tokenEstimate: number;
      validationWarnings: string[];
    } | null = null;
    let templateFound = true;

    try {
      const preview = await this.promptBuilderService.previewPrompt({
        templateId: TEST_STRATEGY_TEMPLATE_ID,
        projectId,
        variableOverrides: {
          requirements: [requirement as any],
        },
      });
      builtPrompt = {
        systemPrompt: preview.systemPrompt,
        userPrompt: preview.userPrompt,
        tokenEstimate: preview.tokenEstimate,
        validationWarnings: preview.validationWarnings,
      };
    } catch (err: any) {
      templateFound = false;
      warnings.push(`Test Strategy template could not be built: ${err.message}`);
    }

    if (!templateFound || !builtPrompt) {
      warnings.push('No Test Strategy prompt template was found. Using fallback prompt.');
      builtPrompt = {
        systemPrompt: 'You are a test strategy expert.',
        userPrompt: `Create a test strategy for the requirement: ${requirement.title}.`,
        tokenEstimate: 0,
        validationWarnings: ['Fallback prompt used - template not found.'],
      };
    }

    const messages: AIProviderMessage[] = [
      { role: 'system', content: builtPrompt.systemPrompt },
      { role: 'user', content: builtPrompt.userPrompt },
    ];

    // ---------------------------------------------------------------------
    // 4. Call the AI Orchestrator
    // ---------------------------------------------------------------------
    const generateResult = await this.manageAIProviders.generate(request.providerId, messages);

    // ---------------------------------------------------------------------
    // Preview mode: return context summary + prompt + estimates
    // ---------------------------------------------------------------------
    if (request.previewOnly) {
      return {
        strategy: null,
        preview: {
          contextSummary: this.buildContextSummary(context, requirement),
          generatedPrompt: builtPrompt,
          tokenEstimate: generateResult.usage.totalTokens,
          costEstimate: generateResult.cost.totalCost,
        },
        warnings,
        providerUsed: {
          id: providerEntity.id,
          name: providerEntity.name,
          provider: providerEntity.provider,
          model: generateResult.model,
        },
      };
    }

    // ---------------------------------------------------------------------
    // 5. Parse structured JSON from the AI response
    // ---------------------------------------------------------------------
    const parsed = this.parseStructuredResponse(generateResult.content);
    if (parsed.sections.length === 0) {
      warnings.push('AI response did not contain valid structured JSON. Falling back to context-derived strategy.');
    }

    // ---------------------------------------------------------------------
    // 6. Build + persist TestStrategyEntity
    // ---------------------------------------------------------------------
    const sections =
      parsed.sections.length > 0
        ? parsed.sections
        : this.deriveSectionsFromContext(context, requirement);

    const now = Date.now();
    const strategy = new TestStrategyEntity(
      randomUUID(),
      requirement.id,
      projectId,
      sections,
      now,
      now
    );

    const saved = await this.testStrategyRepository.create(strategy);

    // Publish GENERATED event through central EventPublisher.
    // The VersionEventListener will automatically create a version snapshot.
    if (this.eventPublisher) {
      await this.eventPublisher.generated('strategy', saved.id, saved.projectId, 'TestStrategy', {
        requirementId: requirement.id,
        providerName: providerEntity.name,
        model: generateResult.model,
      } as any);
    }

    return {
      strategy: saved,
      warnings,
      providerUsed: {
        id: providerEntity.id,
        name: providerEntity.name,
        provider: providerEntity.provider,
        model: generateResult.model,
      },
    };
  }

  // ---------------------------------------------------------------------
  // Parsing helpers
  // ---------------------------------------------------------------------

  private parseStructuredResponse(content: string): {
    sections: StrategyCategorySection[];
  } {
    const sections: StrategyCategorySection[] = [];
    if (!content) return { sections };

    const candidates: string[] = [];

    // 1. Full raw content (if it's already JSON)
    candidates.push(content);

    // 2. Content inside ```json ... ``` fences
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);

    // 3. Content wrapped in braces { ... } (greedy)
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) candidates.push(braceMatch[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const rawSections: any[] = Array.isArray(parsed)
          ? parsed
          : parsed.sections
            ? (Array.isArray(parsed.sections) ? parsed.sections : [])
            : parsed.strategy?.sections
              ? (Array.isArray(parsed.strategy.sections) ? parsed.strategy.sections : [])
              : [];

        for (const rawSection of rawSections) {
          const category = this.normalizeCategory(rawSection.category || rawSection.name);
          const rawItems = Array.isArray(rawSection.items) ? rawSection.items : [];
          const items: StrategyItem[] = rawItems
            .map((item: any) => {
              if (!item || typeof item !== 'object') return null;
              return {
                id: randomUUID(),
                title: String(item.title || item.testScenario || 'Untitled strategy item'),
                reason: String(item.reason || item.description || ''),
                relatedApis: this.toStringArray(item.relatedApis),
                relatedData: this.toStringArray(item.relatedData),
                priority: this.normalizePriority(item.priority),
                status: 'Enabled',
              };
            })
            .filter(Boolean) as StrategyItem[];

          if (category && items.length > 0) {
            sections.push({ category, items });
          }
        }
        if (sections.length > 0) break;
      } catch {
        // Try next candidate
      }
    }

    return { sections };
  }

  private normalizeCategory(value: any): StrategyCategory {
    const str = String(value || '').trim();
    if (DEFAULT_SECTIONS.includes(str as StrategyCategory)) return str as StrategyCategory;
    // Map common variations to known categories
    const lower = str.toLowerCase();
    if (lower.includes('positive') || lower.includes('happy')) return 'Positive';
    if (lower.includes('negative') || lower.includes('error path')) return 'Negative';
    if (lower.includes('boundary') || lower.includes('edge')) return 'Boundary';
    if (lower.includes('business')) return 'Business Rules';
    if (lower.includes('security') || lower.includes('auth')) return 'Security';
    if (lower.includes('validation')) return 'Validation';
    if (lower.includes('error') || lower.includes('exception')) return 'Error Handling';
    if (lower.includes('integration')) return 'Integration';
    if (lower.includes('regression')) return 'Regression';
    if (lower.includes('performance') || lower.includes('load')) return 'Performance';
    if (lower.includes('accessib')) return 'Accessibility';
    if (lower.includes('local')) return 'Localization';
    return 'Positive';
  }

  private normalizePriority(value: any): StrategyPriority {
    const str = String(value || 'Medium').toLowerCase();
    if (str.includes('high')) return 'High';
    if (str.includes('low')) return 'Low';
    return 'Medium';
  }

  /**
   * Derive deterministic strategy sections from the requirement + project context.
   */
  private deriveSectionsFromContext(context: any, requirement: any): StrategyCategorySection[] {
    const requirementName = requirement.title || requirement.name || 'requirement';

    // Collect related APIs / data
    const relatedApis = Array.isArray(requirement.relatedOperations)
      ? requirement.relatedOperations
      : [];
    const relatedData = Array.isArray(requirement.relatedDatasets)
      ? requirement.relatedDatasets
      : [];

    // Merge with context-derived related info
    const apiOperations = context?.apiOperations || [];
    const datasets = context?.datasets || [];

    // If no relatedApis on requirement, derive from context API operations
    let effectiveApis = [...relatedApis];
    if (effectiveApis.length === 0 && apiOperations.length > 0) {
      effectiveApis = apiOperations.slice(0, 3).map((op: any) => op.name || op.id || `${op.method || 'GET'} ${op.path || ''}`);
    }

    let effectiveData = [...relatedData];
    if (effectiveData.length === 0 && datasets.length > 0) {
      effectiveData = datasets.slice(0, 3).map((d: any) => d.name || d.id);
    }

    const patterns: Array<{ category: StrategyCategory; title: string; reason: string; priority: StrategyPriority }> = [
      { category: 'Positive', title: `Verify ${requirementName} with valid inputs`, reason: 'Ensure the requirement works correctly under normal conditions.', priority: 'High' },
      { category: 'Negative', title: `Verify ${requirementName} with invalid inputs`, reason: 'Ensure the system handles invalid inputs gracefully.', priority: 'High' },
      { category: 'Boundary', title: `Verify ${requirementName} at boundary values`, reason: 'Ensure edge cases are handled correctly.', priority: 'Medium' },
      { category: 'Business Rules', title: `Verify ${requirementName} enforces business rules`, reason: 'Ensure business logic is correctly applied.', priority: 'High' },
      { category: 'Security', title: `Verify ${requirementName} security controls`, reason: 'Ensure authentication, authorization, and data protection are enforced.', priority: 'High' },
      { category: 'Validation', title: `Verify ${requirementName} input validation`, reason: 'Ensure all inputs are validated correctly.', priority: 'Medium' },
      { category: 'Error Handling', title: `Verify ${requirementName} error handling`, reason: 'Ensure errors are handled gracefully and appropriate messages are returned.', priority: 'Medium' },
      { category: 'Integration', title: `Verify ${requirementName} integration with dependent systems`, reason: 'Ensure integration points work correctly.', priority: 'Medium' },
      { category: 'Regression', title: `Verify ${requirementName} does not break existing functionality`, reason: 'Ensure changes do not introduce regressions.', priority: 'Low' },
      { category: 'Performance', title: `Verify ${requirementName} performance under load`, reason: 'Ensure the requirement performs acceptably under expected load.', priority: 'Low' },
      { category: 'Accessibility', title: `Verify ${requirementName} accessibility`, reason: 'Ensure the requirement is accessible to all users.', priority: 'Low' },
      { category: 'Localization', title: `Verify ${requirementName} localization`, reason: 'Ensure the requirement works across different locales.', priority: 'Low' },
    ];

    return patterns.map((pattern) => ({
      category: pattern.category,
      items: [
        {
          id: randomUUID(),
          title: pattern.title,
          reason: pattern.reason,
          relatedApis: effectiveApis,
          relatedData: effectiveData,
          priority: pattern.priority,
          status: 'Enabled',
        },
      ],
    }));
  }

  private toStringArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'string' ? v : v?.name || v?.id || String(v)))
        .filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  }

  private buildContextSummary(context: any, requirement: any): Record<string, any> {
    return {
      requirementId: requirement.id,
      requirementTitle: requirement.title,
      requirementCategory: requirement.category,
      requirementConfidence: requirement.confidence,
      relatedOperations: (requirement.relatedOperations || []).length,
      relatedFlows: (requirement.relatedFlows || []).length,
      relatedDatasets: (requirement.relatedDatasets || []).length,
      apis: (context?.apis || []).length,
      apiOperations: (context?.apiOperations || []).length,
      environments: (context?.environments || []).length,
      datasets: (context?.datasets || []).length,
      businessRules: (context?.businessRules || []).length,
      knowledgeFlows: (context?.knowledgeFlows || []).length,
      runtimeVariables: (context?.runtimeVariables || []).length,
    };
  }
}

export default GenerateTestStrategyWithAI;