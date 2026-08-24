// GenerateTestDesignWithAI - Application Use Case
// Generates TestDesign entities using the AI Provider Framework.
// Reuses existing services and repositories. No new AI framework.

import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository.js';
import {
  TestDesignEntity,
  RequestOverride,
  RuntimeBinding,
  Assertion,
  CleanupStep,
} from '../../domain/requirements/TestDesignEntity.js';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import { TestStrategyEntity } from '../../domain/requirements/TestStrategyEntity.js';
import { ProjectContextService } from '../context/ProjectContextService.js';
import { PromptBuilderService } from '../prompt/PromptBuilderService.js';
import { ManageAIProviders } from '../ai-provider/ManageAIProviders.js';
import { VersionService } from '../versioning/VersionService.js';
import { EventPublisher } from '../EventPublisher.js';
import type { AIProviderMessage } from '../../domain/ai-provider/index.js';
import {
  getAcceptanceCriteriaFocusText,
  toRequirementPromptPayload,
} from './requirementAcceptanceFocus.js';
import { pickOperationForCategory } from './RequirementOperationMatcher.js';
import { requirementEndpointMappingService } from './RequirementEndpointMappingService.js';
import type { GenerationProvenanceService } from './GenerationProvenanceService.js';
import { selectByBudget, type GenerationBudget } from './GenerationBudget.js';

export interface GenerateTestDesignWithAIRequest {
  projectId: string;
  requirementId: string;
  providerId: string;
  previewOnly?: boolean;
  /** Internal orchestration defers capture until mapping enrichment completes. */
  deferProvenance?: boolean;
  budget?: GenerationBudget;
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
  acceptanceCriterionId?: string;
  scenarioId?: string;
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
export async function retryStructuredGeneration<T>(generate: () => Promise<{ content: string }>, parse: (content: string) => T[], failureCategory: (error: unknown) => string) { let result: { content: string } | undefined; let parsed: T[] = []; let attempts = 0; let failureCategoryValue = ''; while (attempts < 2) { attempts++; try { result = await generate(); parsed = parse(result.content); if (parsed.length) break; failureCategoryValue = 'MALFORMED_STRUCTURED_OUTPUT'; } catch (error) { failureCategoryValue = failureCategory(error); } } return { result, parsed, attempts, failureCategory: failureCategoryValue }; }

export class GenerateTestDesignWithAI {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly manageAIProviders: ManageAIProviders,
    private readonly versionService: VersionService,
    private readonly eventPublisher?: EventPublisher,
    private readonly provenanceService?: GenerationProvenanceService,
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
    const projectOperations = (context?.apiOperations || []) as any[];
    const existingDesigns = await this.testDesignRepository.findByRequirement(request.requirementId);
    const existingUserOperationIds = existingDesigns
      .filter((design) => design.mappingProvenance === 'user' && design.operationId)
      .map((design) => design.operationId);
    const candidateOperations = requirementEndpointMappingService.rankCandidates(requirement, projectOperations, 8, existingUserOperationIds);
    const candidateIds = new Set(candidateOperations.map((operation) => operation.id));
    const strategyScenarioCandidates = new Map<string, Set<string>>();
    const criterionCandidates = new Map<string, Set<string>>();
    for (const section of strategy?.sections || []) {
      for (const item of section.items) {
        const candidates = requirementEndpointMappingService.rankCandidatesForScenario(
          requirement,
          projectOperations,
          item.acceptanceCriterionId,
          `${item.title} ${item.reason}`,
          8,
          existingUserOperationIds,
        );
        const ids = new Set(candidates.map((operation) => operation.id));
        if (item.scenarioId) strategyScenarioCandidates.set(item.scenarioId, ids);
        if (item.acceptanceCriterionId) criterionCandidates.set(item.acceptanceCriterionId, ids);
      }
    }
    const requirementPrompt = {
      ...toRequirementPromptPayload(requirement),
      title: requirement.title,
      description: requirement.description,
      relatedFlows: requirement.relatedFlows || [],
      strategyScenarios: (strategy?.sections || []).flatMap((section: any) => section.items.map((item: any) => ({
        scenarioId: item.scenarioId,
        strategyItemId: item.id,
        acceptanceCriterionId: item.acceptanceCriterionId,
        title: item.title,
        candidateOperations: (item.scenarioId && strategyScenarioCandidates.get(item.scenarioId)
          ? projectOperations.filter((operation) => strategyScenarioCandidates.get(item.scenarioId)!.has(operation.id))
          : item.acceptanceCriterionId && criterionCandidates.get(item.acceptanceCriterionId)
            ? projectOperations.filter((operation) => criterionCandidates.get(item.acceptanceCriterionId)!.has(operation.id))
            : candidateOperations),
      }))),
      candidateOperations: candidateOperations.map((operation) => ({
        id: operation.id,
        serviceId: operation.serviceId,
        name: operation.name,
        method: operation.method,
        path: operation.path,
        description: operation.description,
        authenticationType: operation.authenticationType,
        tags: operation.tags,
        score: operation.score,
      })),
    };

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
        variableOverrides: { requirements: [requirementPrompt], apiOperations: candidateOperations },
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
    const retried = await retryStructuredGeneration(() => this.manageAIProviders.generate(request.providerId, messages, { maxTokens: 1024, temperature: 0.3 }), content => this.parseStructuredResponse(content).designInputs, error => this.safeFailureCategory(error));
    let generateResult = retried.result as Awaited<ReturnType<ManageAIProviders['generate']>> | undefined;
    const parsed = { designInputs: retried.parsed };
    const attempts = retried.attempts;
    const lastFailure = retried.failureCategory;
    if (!generateResult) generateResult = { content: '', model: providerEntity.model, providerType: providerEntity.provider, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, cost: { inputCost: 0, outputCost: 0, totalCost: 0 }, finished: false };

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

    if (parsed.designInputs.length === 0) {
      warnings.push(`AI response did not contain valid structured JSON after ${attempts} attempt(s). Falling back to context-derived designs.`);
    }

    const designInputs = parsed.designInputs.length > 0
      ? parsed.designInputs
      : this.deriveDesignsFromStrategy(context, requirement, strategy);
    const invalidOperationCount = designInputs.filter((input) => {
      if (!input.operationId) return false;
      const allowed = (input.scenarioId && strategyScenarioCandidates.get(input.scenarioId))
        || (input.acceptanceCriterionId && criterionCandidates.get(input.acceptanceCriterionId))
        || candidateIds;
      return !allowed.has(input.operationId);
    }).length;
    if (invalidOperationCount > 0) {
      warnings.push(`${invalidOperationCount} AI test design operation mapping(s) were outside the supplied candidate set and require review.`);
    }
    const criterionIds = new Set((requirement.acceptanceCriteria || []).map((criterion: any) => criterion.id));
    const invalidCriterionCount = designInputs.filter((input) => input.acceptanceCriterionId && !criterionIds.has(input.acceptanceCriterionId)).length;
    if (invalidCriterionCount > 0) warnings.push(`${invalidCriterionCount} AI test design acceptance-criterion mapping(s) were invalid and require fallback identity.`);
    const strategyScenarioIds = new Set((strategy?.sections || []).flatMap((section: any) => section.items.map((item: any) => item.scenarioId).filter(Boolean)));
    const invalidScenarioCount = designInputs.filter((input) => input.scenarioId && strategyScenarioIds.size > 0 && !strategyScenarioIds.has(input.scenarioId)).length;
    if (invalidScenarioCount > 0) warnings.push(`${invalidScenarioCount} AI scenario identity value(s) were invalid and require fallback identity.`);

    if (!this.provenanceService) {
      throw new Error('Generation provenance service is required for persisted generated designs.');
    }

    const persistedDesigns: TestDesignEntity[] = [];
    for (const input of designInputs) {
      const now = Date.now();
      const strategyItemId = input.strategyItemId || (strategy?.sections[0]?.items[0]?.id) || '';
      const title =
        input.title?.trim() ||
        this.resolveDesignTitle(requirement, strategy, strategyItemId, input);

      const strategyMeta = this.findStrategyItemMeta(strategy, strategyItemId);
      const acceptanceCriterionId = input.acceptanceCriterionId && criterionIds.has(input.acceptanceCriterionId)
        ? input.acceptanceCriterionId
        : strategyMeta?.acceptanceCriterionId;
      const scenarioConfidence = requirementEndpointMappingService.confidenceForScenario(requirement, projectOperations, acceptanceCriterionId, title);
      const allowedOperationIds = (input.scenarioId && strategyScenarioCandidates.get(input.scenarioId))
        || (acceptanceCriterionId && criterionCandidates.get(acceptanceCriterionId))
        || candidateIds;

      const design = new TestDesignEntity(
        randomUUID(),
        projectId,
        request.requirementId,
        strategyItemId,
        title,
        allowedOperationIds.has(input.operationId || '') ? input.operationId || '' : '',
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
        strategyMeta?.expectedHttpStatus,
        ((input.scenarioId && strategyScenarioCandidates.get(input.scenarioId)) || (input.acceptanceCriterionId && criterionCandidates.get(input.acceptanceCriterionId)) || candidateIds).has(input.operationId || '') ? 'ai' : 'matcher',
        allowedOperationIds.has(input.operationId || '') && scenarioConfidence >= 70 ? 'confirmed' : 'review',
        scenarioConfidence,
        acceptanceCriterionId,
        (input.scenarioId && (strategyScenarioIds.size === 0 || strategyScenarioIds.has(input.scenarioId)))
          ? input.scenarioId
          : strategyMeta?.scenarioId || `${acceptanceCriterionId || 'legacy'}:scenario:${strategyItemId}`
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

    if (request.deferProvenance) {
      return {
        designs: persistedDesigns,
        warnings,
        providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
      };
    }
    const selection = selectByBudget(persistedDesigns, request.budget); const ids = new Set(selection.selected.map(x => x.design.id));
    for (const design of persistedDesigns) if (!ids.has(design.id)) await this.testDesignRepository.delete(design.id);
    const capturedDesigns = await this.provenanceService.captureGeneratedDesigns({
      requirement,
      designs: selection.selected.map(x => x.design),
      mode: parsed.designInputs.length ? 'AI_GENERATED' : 'FALLBACK',
      ai: parsed.designInputs.length ? { providerId: providerEntity.id, provider: providerEntity.provider, model: generateResult.model, promptTemplateId: TEST_DESIGN_TEMPLATE_ID, promptVersion: '1', attemptedAt: Date.now(), attempts, validationStatus: 'VALID', outcome: 'SUCCESS' } : undefined,
      fallbackReason: parsed.designInputs.length ? undefined : lastFailure || 'MALFORMED_STRUCTURED_OUTPUT',
      budgetDecisions: new Map(selection.selected.map(x => [x.design.id, { ...x.decision, omissions: selection.omitted }])),
    });
    return {
      designs: capturedDesigns,
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
            acceptanceCriterionId: raw.acceptanceCriterionId ? String(raw.acceptanceCriterionId) : undefined,
            scenarioId: raw.scenarioId ? String(raw.scenarioId) : undefined,
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

  private safeFailureCategory(error: unknown): string { const message = error instanceof Error ? error.message : String(error); if (/timeout|timed out/i.test(message)) return 'TIMEOUT'; if (/simulated/i.test(message)) return 'SIMULATED_PROVIDER_BLOCKED'; if (/unauthori[sz]ed|api[_ -]?key|token|secret/i.test(message)) return 'AUTH_OR_CONFIGURATION'; return 'PROVIDER_FAILURE'; }

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
        const scenarioIndex = categories.indexOf(category);
        inputs.push({
          strategyItemId: `cat-${category.toLowerCase()}`,
          acceptanceCriterionId: requirement.acceptanceCriteria?.[0]?.id,
          scenarioId: `${requirement.acceptanceCriteria?.[0]?.id || 'legacy'}:scenario:${scenarioIndex}`,
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
            acceptanceCriterionId: item.acceptanceCriterionId,
            scenarioId: item.scenarioId || item.id,
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
  ): { testCaseType?: 'Positive' | 'Negative' | 'Security'; expectedHttpStatus?: number; priority?: 'High' | 'Medium' | 'Low'; acceptanceCriterionId?: string; scenarioId?: string } | null {
    if (!strategy) return null;
    for (const section of strategy.sections) {
      const item = section.items.find((i) => i.id === strategyItemId);
      if (item) {
        return {
          testCaseType: item.testCaseType,
          expectedHttpStatus: item.expectedHttpStatus,
          priority: item.priority,
          acceptanceCriterionId: item.acceptanceCriterionId,
          scenarioId: item.scenarioId,
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
