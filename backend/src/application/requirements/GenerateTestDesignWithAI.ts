// GenerateTestDesignWithAI - Application Use Case
// Generates TestDesign entities using the AI Provider Framework.
// Reuses existing services and repositories. No new AI framework.

import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository';
import {
  TestDesignEntity,
  RequestOverride,
  RuntimeBinding,
  Assertion,
  CleanupStep,
} from '../../domain/requirements/TestDesignEntity';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository';
import { TestStrategyEntity } from '../../domain/requirements/TestStrategyEntity';
import { ProjectContextService } from '../context/ProjectContextService';
import { PromptBuilderService } from '../prompt/PromptBuilderService';
import { ManageAIProviders } from '../ai-provider/ManageAIProviders';
import { VersionService } from '../versioning/VersionService';
import { EventPublisher } from '../EventPublisher';
import type { AIProviderMessage } from '../../domain/ai-provider';
import {
  getAcceptanceCriteriaFocusText,
  toRequirementPromptPayload,
} from './requirementAcceptanceFocus';
import { pickOperationForCategory } from './RequirementOperationMatcher';

export interface GenerateTestDesignWithAIRequest {
  projectId: string;
  requirementId: string;
  providerId: string;
  previewOnly?: boolean;
}

export interface TestDesignGenerationResult {
  designs: TestDesignEntity[];
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

interface ParsedTestDesignInput {
  strategyItemId?: string;
  title?: string;
  operationId?: string;
  environmentId?: string;
  datasetId?: string;
  datasetRowReference?: string;
  requestOverrides?: RequestOverride;
  runtimeBindings?: RuntimeBinding[];
  assertions?: Assertion[];
  cleanup?: CleanupStep[];
  priority?: 'High' | 'Medium' | 'Low';
}

const TEST_DESIGN_TEMPLATE_ID = 'tmpl-design-001';

export class GenerateTestDesignWithAI {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly manageAIProviders: ManageAIProviders,
    private readonly versionService: VersionService,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(request: GenerateTestDesignWithAIRequest): Promise<TestDesignGenerationResult> {
    const warnings: string[] = [];

    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${request.requirementId} not found`);
    }
    const projectId = request.projectId || requirement.projectId;

    const strategy = await this.testStrategyRepository.findByRequirement(request.requirementId);
    if (!strategy) {
      warnings.push('No approved test strategy found for this requirement. Using context-derived fallback.');
    }

    let context: any = null;
    try {
      context = await this.projectContextService.buildContext(projectId);
    } catch (err: any) {
      warnings.push(`Project context could not be built: ${err.message}`);
    }
    if (!context) warnings.push('No project context was available for test design generation.');

    let providerEntity;
    try {
      providerEntity = await this.manageAIProviders.getProvider(request.providerId);
    } catch (err: any) {
      throw new Error(`AI Provider could not be resolved: ${err.message}`);
    }
    if (!providerEntity.enabled) {
      warnings.push(`AI Provider "${providerEntity.name}" is disabled. Using placeholder design generation.`);
    }

    let builtPrompt: { systemPrompt: string; userPrompt: string; tokenEstimate: number; validationWarnings: string[] } | null = null;
    let templateFound = true;
    try {
      const preview = await this.promptBuilderService.previewPrompt({
        templateId: TEST_DESIGN_TEMPLATE_ID,
        projectId,
        variableOverrides: { requirements: [toRequirementPromptPayload(requirement)] },
      });
      builtPrompt = {
        systemPrompt: preview.systemPrompt,
        userPrompt: preview.userPrompt,
        tokenEstimate: preview.tokenEstimate,
        validationWarnings: preview.validationWarnings,
      };
    } catch (err: any) {
      templateFound = false;
      warnings.push(`Test Design template could not be built: ${err.message}`);
    }
    if (!templateFound || !builtPrompt) {
      warnings.push('No Test Design prompt template was found. Using fallback prompt.');
      builtPrompt = {
        systemPrompt: 'You are a test design specialist.',
        userPrompt: `Create test designs for the following acceptance criteria:\n\n${getAcceptanceCriteriaFocusText(requirement) || '(no acceptance criteria provided)'}`,
        tokenEstimate: 0,
        validationWarnings: ['Fallback prompt used - template not found.'],
      };
    }

    const messages: AIProviderMessage[] = [
      { role: 'system', content: builtPrompt.systemPrompt },
      { role: 'user', content: builtPrompt.userPrompt },
    ];
    const generateResult = await this.manageAIProviders.generate(request.providerId, messages, {
      maxTokens: 1024,
      temperature: 0.3,
    });

    if (request.previewOnly) {
      return {
        designs: [],
        preview: {
          contextSummary: this.buildContextSummary(context, requirement, strategy),
          generatedPrompt: builtPrompt,
          tokenEstimate: generateResult.usage.totalTokens,
          costEstimate: generateResult.cost.totalCost,
        },
        warnings,
        providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
      };
    }

    const parsed = this.parseStructuredResponse(generateResult.content);
    if (parsed.designInputs.length === 0) {
      warnings.push('AI response did not contain valid structured JSON. Falling back to context-derived designs.');
    }

    const designInputs = parsed.designInputs.length > 0
      ? parsed.designInputs
      : this.deriveDesignsFromStrategy(context, requirement, strategy);

    const persistedDesigns: TestDesignEntity[] = [];
    for (const input of designInputs) {
      const now = Date.now();
      const strategyItemId = input.strategyItemId || (strategy?.sections[0]?.items[0]?.id) || '';
      const title =
        input.title?.trim() ||
        this.resolveDesignTitle(requirement, strategy, strategyItemId, input);

      const strategyMeta = this.findStrategyItemMeta(strategy, strategyItemId);

      const design = new TestDesignEntity(
        randomUUID(),
        projectId,
        request.requirementId,
        strategyItemId,
        title,
        input.operationId || '',
        input.environmentId || (context?.environments && context.environments[0]?.id) || '',
        input.datasetId || (context?.datasets && context.datasets[0]?.id) || '',
        input.datasetRowReference || '',
        input.requestOverrides || {},
        input.runtimeBindings || [],
        input.assertions || [],
        input.cleanup || [],
        input.priority || strategyMeta?.priority || 'Medium',
        'Ready',
        now,
        now,
        [],
        strategyMeta?.testCaseType,
        strategyMeta?.expectedHttpStatus
      );

      const saved = await this.testDesignRepository.create(design);

      // Publish GENERATED event through central EventPublisher.
      // The VersionEventListener will automatically create a version snapshot.
      if (this.eventPublisher) {
        await this.eventPublisher.generated('design', saved.id, saved.projectId, 'TestDesign', {
          requirementId: requirement.id,
          strategyId: strategy?.id,
          providerName: providerEntity.name,
          model: generateResult.model,
        } as any);
      }

      persistedDesigns.push(saved);
    }

    return {
      designs: persistedDesigns,
      warnings,
      providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
    };
  }

  // ---------------------------------------------------------------------
  // Parsing helpers
  // ---------------------------------------------------------------------

  private parseStructuredResponse(content: string): { designInputs: ParsedTestDesignInput[] } {
    const designInputs: ParsedTestDesignInput[] = [];
    if (!content) return { designInputs };

    const candidates: string[] = [content];
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) candidates.push(braceMatch[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const rawDesigns: any[] = Array.isArray(parsed)
          ? parsed
          : parsed.designs
            ? (Array.isArray(parsed.designs) ? parsed.designs : [])
            : parsed.design
              ? [parsed.design]
              : [];

        for (const raw of rawDesigns) {
          if (!raw || typeof raw !== 'object') continue;
          const requestOverrides: RequestOverride = {};
          if (raw.requestOverrides?.headers && typeof raw.requestOverrides.headers === 'object') requestOverrides.headers = raw.requestOverrides.headers;
          if (raw.requestOverrides?.queryParams && typeof raw.requestOverrides.queryParams === 'object') requestOverrides.queryParams = raw.requestOverrides.queryParams;
          if ('body' in (raw.requestOverrides || {})) requestOverrides.body = raw.requestOverrides.body;

          designInputs.push({
            strategyItemId: raw.strategyItemId ? String(raw.strategyItemId) : undefined,
            title: raw.title ? String(raw.title) : raw.name ? String(raw.name) : undefined,
            operationId: raw.operationId ? String(raw.operationId) : undefined,
            environmentId: raw.environmentId ? String(raw.environmentId) : undefined,
            datasetId: raw.datasetId ? String(raw.datasetId) : undefined,
            datasetRowReference: raw.datasetRowReference ? String(raw.datasetRowReference) : undefined,
            requestOverrides,
            runtimeBindings: this.normalizeRuntimeBindings(raw.runtimeBindings),
            assertions: this.normalizeAssertions(raw.assertions),
            cleanup: this.normalizeCleanup(raw.cleanup),
            priority: this.normalizePriority(raw.priority),
          });
        }
        if (designInputs.length > 0) break;
      } catch {
        // Try next candidate
      }
    }
    return { designInputs };
  }

  private normalizePriority(value: any): 'High' | 'Medium' | 'Low' {
    const str = String(value || 'Medium').toLowerCase();
    if (str.includes('high')) return 'High';
    if (str.includes('low')) return 'Low';
    return 'Medium';
  }

  private normalizeRuntimeBindings(value: any): RuntimeBinding[] {
    if (!Array.isArray(value)) return [];
    const result: RuntimeBinding[] = [];
    for (const v of value) {
      if (!v || typeof v !== 'object') continue;
      const source = String(v.source || 'request');
      if (source !== 'request' && source !== 'response' && source !== 'environment') continue;
      const variable = String(v.variable || '');
      if (!variable) continue;
      const binding: RuntimeBinding = { variable, source: source as 'request' | 'response' | 'environment' };
      if (v.path) binding.path = String(v.path);
      result.push(binding);
    }
    return result;
  }

  private normalizeAssertions(value: any): Assertion[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((v: any) => {
        if (!v || typeof v !== 'object') return null;
        const type = String(v.type || '');
        if (type !== 'status' && type !== 'body' && type !== 'header' && type !== 'jsonPath') return null;
        const operator = String(v.operator || 'equals');
        if (operator !== 'equals' && operator !== 'contains' && operator !== 'matches' && operator !== 'exists') return null;
        return { type: type as Assertion['type'], operator: operator as Assertion['operator'], path: String(v.path || ''), expected: 'expected' in v ? v.expected : true };
      })
      .filter((v): v is Assertion => !!v);
  }

  private normalizeCleanup(value: any): CleanupStep[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((v: any) => {
        if (!v || typeof v !== 'object') return null;
        const type = String(v.type || '');
        if (type !== 'api' && type !== 'dataset' && type !== 'environment') return null;
        return { type: type as CleanupStep['type'], action: String(v.action || ''), target: String(v.target || '') };
      })
      .filter((v): v is CleanupStep => !!v);
  }

  private deriveDesignsFromStrategy(context: any, requirement: any, strategy: TestStrategyEntity | null): ParsedTestDesignInput[] {
    const inputs: ParsedTestDesignInput[] = [];
    const environments = context?.environments || [];
    const datasets = context?.datasets || [];
    const apiOperations = context?.apiOperations || [];
    const environment = environments.find((e: any) => (e.name || '').toLowerCase().includes('qa')) || environments[0];
    const dataset = datasets[0];

    if (!strategy) {
      const categories = ['Positive', 'Negative', 'Boundary', 'Security', 'Validation'];
      for (const category of categories) {
        inputs.push({
          strategyItemId: `cat-${category.toLowerCase()}`,
          title: this.categoryTitle(requirement.title, category),
          operationId: apiOperations.length > 0
            ? pickOperationForCategory(requirement, apiOperations, category as any)
            : '',
          environmentId: environment?.id || '',
          datasetId: dataset?.id || '',
          datasetRowReference: dataset ? `row-${Date.now()}` : '',
          requestOverrides: this.defaultRequestOverrides(category),
          runtimeBindings: this.defaultRuntimeBindings(category),
          assertions: this.defaultAssertions(category),
          cleanup: this.defaultCleanup(category),
          priority: category === 'Positive' || category === 'Security' ? 'High' : 'Medium',
        });
      }
    } else {
      for (const section of strategy.sections) {
        for (const item of section.items) {
          if (item.status !== 'Enabled') continue;
          const category = section.category;
          inputs.push({
            strategyItemId: item.id,
            title: item.title,
            operationId: apiOperations.length > 0
              ? pickOperationForCategory(requirement, apiOperations, category as any)
              : '',
            environmentId: environment?.id || '',
            datasetId: dataset?.id || '',
            datasetRowReference: dataset ? `row-${Date.now()}` : '',
            requestOverrides: this.defaultRequestOverrides(category),
            runtimeBindings: this.defaultRuntimeBindings(category),
            assertions: this.defaultAssertions(category),
            cleanup: this.defaultCleanup(category),
            priority: item.priority,
          });
        }
      }
    }
    return inputs;
  }

  private defaultRequestOverrides(category: string): RequestOverride {
    const overrides: RequestOverride = {};
    switch (category) {
      case 'Negative':
      case 'Validation':
        overrides.body = { invalid: true };
        break;
      case 'Security':
        overrides.headers = { Authorization: 'Bearer invalid-token' };
        break;
      case 'Boundary':
        overrides.body = { boundary: true };
        break;
      default:
        overrides.body = {};
    }
    return overrides;
  }

  private defaultRuntimeBindings(category: string): RuntimeBinding[] {
    const bindings: RuntimeBinding[] = [];
    if (category === 'Security' || category === 'Integration') bindings.push({ variable: 'accessToken', source: 'response', path: '$.accessToken' });
    if (category === 'Validation' || category === 'Error Handling') bindings.push({ variable: 'errorCode', source: 'response', path: '$.error.code' });
    return bindings;
  }

  private defaultAssertions(category: string): Assertion[] {
    switch (category) {
      case 'Positive':
        return [
          { type: 'status', operator: 'equals', path: '$.status', expected: 200 },
          { type: 'body', operator: 'exists', path: '$.data', expected: true },
        ];
      case 'Negative':
      case 'Validation':
        return [{ type: 'status', operator: 'equals', path: '$.status', expected: 400 }];
      case 'Security':
        return [{ type: 'status', operator: 'equals', path: '$.status', expected: 401 }];
      case 'Error Handling':
        return [
          { type: 'status', operator: 'equals', path: '$.status', expected: 500 },
          { type: 'body', operator: 'exists', path: '$.error', expected: true },
        ];
      default:
        return [{ type: 'status', operator: 'equals', path: '$.status', expected: 200 }];
    }
  }

  private defaultCleanup(category: string): CleanupStep[] {
    if (category === 'Integration' || category === 'Regression') return [{ type: 'dataset', action: 'cleanup', target: 'test-data' }];
    return [];
  }

  private findStrategyItemMeta(
    strategy: TestStrategyEntity | null,
    strategyItemId: string,
  ): { testCaseType?: 'Positive' | 'Negative' | 'Security'; expectedHttpStatus?: number; priority?: 'High' | 'Medium' | 'Low' } | null {
    if (!strategy) return null;
    for (const section of strategy.sections) {
      const item = section.items.find((i) => i.id === strategyItemId);
      if (item) {
        return {
          testCaseType: item.testCaseType,
          expectedHttpStatus: item.expectedHttpStatus,
          priority: item.priority,
        };
      }
    }
    return null;
  }

  private categoryTitle(acFocus: string, category: string): string {
    const templates: Record<string, string> = {
      Positive: 'Successfully complete when {action}',
      Negative: 'Reject the request when inputs are invalid for: {action}',
      Boundary: 'Exercise boundary values for: {action}',
      Security: 'Reject unauthenticated or unauthorized access for: {action}',
      Validation: 'Return validation errors for invalid fields when: {action}',
    };
    const template = templates[category] || 'Validate scenario for: {action}';
    return template.replace('{action}', acFocus).replace('{category}', category);
  }

  private resolveDesignTitle(
    requirement: { title: string; acceptanceCriteria?: { text: string }[]; description?: string },
    strategy: TestStrategyEntity | null,
    strategyItemId: string,
    input: ParsedTestDesignInput,
  ): string {
    if (strategy) {
      for (const section of strategy.sections) {
        const item = section.items.find((i) => i.id === strategyItemId);
        if (item?.title) return item.title;
      }
    }
    const acFocus = getAcceptanceCriteriaFocusText(requirement as any);
    const catMatch = strategyItemId.match(/^cat-(\w+)$/i);
    if (catMatch) {
      const category =
        catMatch[1].charAt(0).toUpperCase() + catMatch[1].slice(1).toLowerCase();
      return this.categoryTitle(acFocus || requirement.title, category);
    }
    const statusAssertion = input.assertions?.find((a) => a.type === 'status');
    if (statusAssertion && acFocus) {
      return `${acFocus} (expect HTTP ${statusAssertion.expected})`;
    }
    return acFocus || requirement.title;
  }

  private buildContextSummary(context: any, requirement: any, strategy: TestStrategyEntity | null): Record<string, any> {
    return {
      requirementId: requirement.id,
      requirementTitle: requirement.title,
      requirementCategory: requirement.category,
      strategySections: strategy?.sections?.length || 0,
      strategyItems: strategy?.sections?.reduce((sum, s) => sum + s.items.length, 0) || 0,
      apis: (context?.apis || []).length,
      apiOperations: (context?.apiOperations || []).length,
      environments: (context?.environments || []).length,
      datasets: (context?.datasets || []).length,
      datasetColumns: (context?.datasetColumns || []).length,
      businessRules: (context?.businessRules || []).length,
      knowledgeFlows: (context?.knowledgeFlows || []).length,
      runtimeVariables: (context?.runtimeVariables || []).length,
    };
  }
}

export default GenerateTestDesignWithAI;
