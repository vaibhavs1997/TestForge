// GenerateRequirementsWithAI - Application Use Case
// Generates Requirement entities using the AI Provider Framework.
// Reuses: ProjectContextService, PromptBuilderService, ManageAIProviders (AI Orchestrator),
// RequirementRepository, VersionService.
// Does NOT implement any new framework. Relies on deterministic placeholder AI responses
// and structured JSON parsing with graceful fallbacks.

import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import {
  RequirementEntity,
  RequirementSource,
  AcceptanceCriterion,
} from '../../domain/requirements/RequirementEntity.js';
import { ProjectContextService } from '../context/ProjectContextService.js';
import { PromptBuilderService } from '../prompt/PromptBuilderService.js';
import { ManageAIProviders } from '../ai-provider/ManageAIProviders.js';
import { VersionService } from '../versioning/VersionService.js';
import { EventPublisher } from '../EventPublisher.js';
import type { AIProviderMessage } from '../../domain/ai-provider/index.js';

export interface GenerateRequirementsWithAIRequest {
  projectId: string;
  providerId: string;
  previewOnly?: boolean;
}

export interface GeneratedRequirementInput {
  title: string;
  description: string;
  category: string;
  confidence: number;
  relatedOperations?: string[];
  relatedFlows?: string[];
  relatedDatasets?: string[];
  acceptanceCriteria?: string[];
}

export interface RequirementGenerationResult {
  requirements: RequirementEntity[];
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

const REQUIREMENT_GENERATION_TEMPLATE_ID = 'tmpl-req-gen-001';

export class GenerateRequirementsWithAI {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly manageAIProviders: ManageAIProviders,
    private readonly versionService: VersionService,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(request: GenerateRequirementsWithAIRequest): Promise<RequirementGenerationResult> {
    const warnings: string[] = [];

    // ---------------------------------------------------------------------
    // 1. Build Project Context
    // ---------------------------------------------------------------------
    let context: any = null;
    try {
      context = await this.projectContextService.buildContext(request.projectId);
    } catch (err: any) {
      warnings.push(`Project context could not be built: ${err.message}`);
    }

    // Validate: no project context (warning, not failure)
    if (!context) {
      warnings.push('No project context was available for generation.');
    }

    // ---------------------------------------------------------------------
    // 2. Resolve selected AI Provider (via AI Provider Framework)
    // ---------------------------------------------------------------------
    let providerEntity;
    try {
      providerEntity = await this.manageAIProviders.getProvider(request.providerId);
    } catch (err: any) {
      // Reuse the framework's error to signal missing provider
      throw new Error(`AI Provider could not be resolved: ${err.message}`);
    }

    // Validate: AI provider disabled
    if (!providerEntity.enabled) {
      warnings.push(`AI Provider "${providerEntity.name}" is disabled. Using placeholder generation.`);
    }

    // ---------------------------------------------------------------------
    // 3. Build Prompt using the existing Requirement Generation template
    // ---------------------------------------------------------------------
    let builtPrompt: {
      systemPrompt: string;
      userPrompt: string;
      tokenEstimate: number;
      validationWarnings: string[];
    } | null = null;
    let templateFound = true;

    try {
      // Use previewPrompt to build WITHOUT persisting (we want the rendered prompt as AI input)
      const preview = await this.promptBuilderService.previewPrompt({
        templateId: REQUIREMENT_GENERATION_TEMPLATE_ID,
        projectId: request.projectId,
      });
      builtPrompt = {
        systemPrompt: preview.systemPrompt,
        userPrompt: preview.userPrompt,
        tokenEstimate: preview.tokenEstimate,
        validationWarnings: preview.validationWarnings,
      };
    } catch (err: any) {
      templateFound = false;
      warnings.push(`Requirement Generation template could not be built: ${err.message}`);
    }

    // Validate: no prompt template
    if (!templateFound || !builtPrompt) {
      warnings.push('No Requirement Generation prompt template was found. Using fallback prompt.');
      builtPrompt = {
        systemPrompt: 'You are a requirements analyst.',
        userPrompt: context
          ? `Generate requirements from the following project context.`
          : 'No project context available.',
        tokenEstimate: 0,
        validationWarnings: ['Fallback prompt used - template not found.'],
      };
    }

    // Build the messages for the AI provider
    const messages: AIProviderMessage[] = [
      { role: 'system', content: builtPrompt.systemPrompt },
      { role: 'user', content: builtPrompt.userPrompt },
    ];

    // ---------------------------------------------------------------------
    // 4. Call the AI Orchestrator (ManageAIProviders.generate)
    // ---------------------------------------------------------------------
    const generateResult = await this.manageAIProviders.generate(request.providerId, messages);

    // ---------------------------------------------------------------------
    // Preview mode: return context summary + prompt + estimates, no requirements
    // ---------------------------------------------------------------------
    if (request.previewOnly) {
      return {
        requirements: [],
        preview: {
          contextSummary: this.buildContextSummary(context),
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
    if (parsed.parsedRequirements.length === 0) {
      warnings.push('AI response did not contain valid structured JSON. Falling back to context-derived requirements.');
    }

    // ---------------------------------------------------------------------
    // 6. Validate + Create Requirement entities + persist
    // ---------------------------------------------------------------------
    const createdRequirements: RequirementEntity[] = [];

    // If structured parsing failed OR no requirements parsed, generate deterministic
    // requirements from the project context (graceful fallback).
    const requirementInputs =
      parsed.parsedRequirements.length > 0
        ? parsed.parsedRequirements
        : this.deriveRequirementsFromContext(context, providerEntity.name);

    for (const input of requirementInputs) {
      const acceptanceCriteria: AcceptanceCriterion[] = (input.acceptanceCriteria || []).map(
        (text) => ({ id: randomUUID(), text })
      );

      // If no acceptance criteria were provided by AI, derive deterministic ones.
      if (acceptanceCriteria.length === 0) {
        input.acceptanceCriteria = this.deriveAcceptanceCriteria(input.title);
        acceptanceCriteria.push(
          ...input.acceptanceCriteria.map((text) => ({ id: randomUUID(), text }))
        );
      }

      const now = Date.now();
      const requirement = new RequirementEntity(
        randomUUID(),
        request.projectId,
        input.title,
        input.description,
        input.category,
        Math.min(100, Math.max(0, input.confidence ?? 70)),
        'ProjectAnalysis' as RequirementSource,
        null,
        'Pending',
        'Suggested',
        input.relatedOperations || [],
        input.relatedFlows || [],
        input.relatedDatasets || [],
        acceptanceCriteria,
        now,
        now
      );

      // Persist using the existing RequirementRepository.
      // The repository publishes a CREATED event through EventPublisher, which
      // automatically triggers audit, versioning, cache invalidation,
      // recommendation refresh, and pipeline refresh (Sprint 3 integration).
      const saved = await this.requirementRepository.create(requirement);

      createdRequirements.push(saved);
    }

    // Publish a GENERATED event for the AI generation operation itself.
    // This triggers the cross-cutting chain for the AI module.
    if (this.eventPublisher && createdRequirements.length > 0) {
      await this.eventPublisher.generated('ai', request.providerId, request.projectId, 'AIRequirementGeneration', {
        providerId: providerEntity.id,
        providerName: providerEntity.name,
        model: generateResult.model,
        requirementsGenerated: createdRequirements.length,
      } as any);
    }

    return {
      requirements: createdRequirements,
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

  /**
   * Extract structured requirements from the AI response content.
   * Tries: raw JSON, JSON inside code fences, JSON inside braces, then falls back.
   */
  private parseStructuredResponse(content: string): {
    parsedRequirements: GeneratedRequirementInput[];
  } {
    const parsedRequirements: GeneratedRequirementInput[] = [];
    if (!content) return { parsedRequirements };

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
        const items: any[] = Array.isArray(parsed)
          ? parsed
          : parsed.requirements
            ? (Array.isArray(parsed.requirements) ? parsed.requirements : [])
            : parsed.requirement
              ? [parsed.requirement]
              : [];

        for (const item of items) {
          if (item && typeof item === 'object' && item.title) {
            const confidence = typeof item.confidence === 'number' ? item.confidence : 70;
            parsedRequirements.push({
              title: String(item.title),
              description: String(item.description || ''),
              category: String(item.category || 'General'),
              confidence,
              relatedOperations: this.toStringArray(item.relatedOperations),
              relatedFlows: this.toStringArray(item.relatedFlows),
              relatedDatasets: this.toStringArray(item.relatedDatasets),
              acceptanceCriteria: this.toStringArray(item.acceptanceCriteria),
            });
          }
        }
        if (parsedRequirements.length > 0) break;
      } catch {
        // Try next candidate
      }
    }

    return { parsedRequirements };
  }

  /**
   * Derive deterministic requirements from the project context when the AI
   * response cannot be parsed. Ensures the feature always produces output.
   */
  private deriveRequirementsFromContext(context: any, providerName: string): GeneratedRequirementInput[] {
    const inputs: GeneratedRequirementInput[] = [];

    const apis = context?.apis || [];
    const apiOperations = context?.apiOperations || [];
    const knowledgeFlows = context?.knowledgeFlows || [];
    const businessRules = context?.businessRules || [];

    // From API operations
    for (const op of apiOperations.slice(0, 8)) {
      const opName =
        op.name || op.displayName || `${op.method || 'GET'} ${op.path || op.endpoint || 'operation'}`;
      inputs.push({
        title: `Validate ${opName}`,
        description: `Ensures the ${opName} operation behaves correctly per its specification.`,
        category: 'Functional',
        confidence: 75,
        relatedOperations: [op.id || opName],
        relatedFlows: this.extractRelatedFlows(op, knowledgeFlows),
        relatedDatasets: this.extractRelatedDatasets(op, context?.datasets || []),
        acceptanceCriteria: [
          `The ${opName} operation returns the expected response for valid input.`,
          `The ${opName} operation handles invalid input gracefully.`,
          `The ${opName} operation enforces required authentication.`,
        ],
      });
    }

    // From knowledge flows
    for (const flow of knowledgeFlows.slice(0, 4)) {
      const flowName = flow.name || flow.title || 'business flow';
      inputs.push({
        title: `Verify ${flowName}`,
        description: `Verifies the ${flowName} business flow end-to-end.`,
        category: 'Business',
        confidence: 70,
        relatedFlows: [flow.id || flowName],
        relatedOperations: this.extractRelatedOps(flow, apiOperations),
        acceptanceCriteria: [
          `The ${flowName} flow completes successfully under normal conditions.`,
          `The ${flowName} flow handles errors appropriately.`,
        ],
      });
    }

    // From business rules
    for (const rule of businessRules.slice(0, 4)) {
      const ruleName = rule.name || rule.title || 'business rule';
      inputs.push({
        title: `Enforce ${ruleName}`,
        description: `Ensures the ${ruleName} business rule is enforced by the application.`,
        category: 'Business Rules',
        confidence: 70,
        relatedFlows: this.extractRelatedFlows(rule, knowledgeFlows),
        acceptanceCriteria: [
          `The system enforces ${ruleName} correctly.`,
          `Edge cases for ${ruleName} are handled safely.`,
        ],
      });
    }

    // From APIs (if operations are not available)
    if (inputs.length === 0) {
      for (const api of apis.slice(0, 4)) {
        const apiName = api.name || api.displayName || 'API';
        inputs.push({
          title: `Validate ${apiName} integration`,
          description: `Ensures the ${apiName} API service is correctly integrated.`,
          category: 'Integration',
          confidence: 65,
          relatedOperations: [],
          acceptanceCriteria: [
            `The ${apiName} API is accessible with valid credentials.`,
            `The ${apiName} API response schema is respected.`,
          ],
        });
      }
    }

    // Ultimate fallback: if there is genuinely no context
    if (inputs.length === 0) {
      inputs.push({
        title: 'Validate core application behavior',
        description: 'Ensures the application behaves correctly for core user scenarios.',
        category: 'Functional',
        confidence: 60,
        acceptanceCriteria: [
          'Successful user flows complete without errors.',
          'Error scenarios are handled gracefully.',
          'User data is persisted correctly.',
        ],
      });
    }

    return inputs.map((input) => ({ ...input, description: input.description || `Generated from project context using ${providerName}.` }));
  }

  /**
   * Derive deterministic acceptance criteria based on the requirement title.
   */
  private deriveAcceptanceCriteria(title: string): string[] {
    return [
      `${title} is satisfied for valid input.`,
      `${title} handles invalid input gracefully.`,
      `${title} enforces required security controls.`,
      `${title} produces correct output by default.`,
    ];
  }

  private extractRelatedFlows(entity: any, flows: any[]): string[] {
    const ids: string[] = [];
    const flowNames = new Set(flows.map((f) => f.name || f.title));
    if (!entity) return ids;
    const related = entity.relatedFlows || entity.flows || [];
    for (const item of related) {
      if (typeof item === 'string') {
        if (flowNames.has(item) || item.startsWith('flow')) ids.push(item);
      } else if (item?.id) {
        ids.push(item.id);
      }
    }
    return ids.slice(0, 5);
  }

  private extractRelatedOps(entity: any, ops: any[]): string[] {
    const ids: string[] = [];
    const opNames = new Set(ops.map((o) => o.name || o.displayName));
    if (!entity) return ids;
    const related = entity.relatedOperations || entity.operations || [];
    for (const item of related) {
      if (typeof item === 'string') {
        if (opNames.has(item) || item.startsWith('op')) ids.push(item);
      } else if (item?.id) {
        ids.push(item.id);
      }
    }
    return ids.slice(0, 5);
  }

  private extractRelatedDatasets(entity: any, datasets: any[]): string[] {
    const ids: string[] = [];
    const datasetNames = new Set(datasets.map((d) => d.name));
    if (!entity) return ids;
    const related = entity.relatedDatasets || entity.datasets || [];
    for (const item of related) {
      if (typeof item === 'string') {
        if (datasetNames.has(item)) ids.push(item);
      } else if (item?.id) {
        ids.push(item.id);
      }
    }
    return ids.slice(0, 5);
  }

  private toStringArray(value: any): string[] {
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'string' ? v : v?.text || v?.name || v?.title || String(v)))
        .filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  }

  /**
   * Build a compact summary of the project context for preview mode.
   */
  private buildContextSummary(context: any): Record<string, any> {
    if (!context) return { empty: true };
    return {
      projectId: context.projectId,
      apis: (context.apis || []).length,
      apiOperations: (context.apiOperations || []).length,
      environments: (context.environments || []).length,
      datasets: (context.datasets || []).length,
      datasetColumns: (context.datasetColumns || []).length,
      knowledgeFlows: (context.knowledgeFlows || []).length,
      businessRules: (context.businessRules || []).length,
      runtimeVariables: (context.runtimeVariables || []).length,
      dependencies: (context.dependencies || []).length,
      requirements: (context.requirements || []).length,
      plugins: (context.plugins || []).length,
      statistics: context.statistics,
      validationWarnings: (context.validationWarnings || []).length,
    };
  }
}

export default GenerateRequirementsWithAI;