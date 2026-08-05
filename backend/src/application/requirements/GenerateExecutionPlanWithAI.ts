// GenerateExecutionPlanWithAI - Application Use Case
// Generates ExecutionPlan entities using the AI Provider Framework.
// Reuses existing services and repositories. No new AI framework.

import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository';
import { ExecutionPlanEntity, RequestTemplate } from '../../domain/requirements/ExecutionPlanEntity';
import { ProjectContextService } from '../context/ProjectContextService';
import { PromptBuilderService } from '../prompt/PromptBuilderService';
import { ManageAIProviders } from '../ai-provider/ManageAIProviders';
import { VersionService } from '../versioning/VersionService';
import { EventPublisher } from '../EventPublisher';
import type { AIProviderMessage } from '../../domain/ai-provider';

export interface GenerateExecutionPlanWithAIRequest {
  projectId: string;
  requirementId: string;
  providerId: string;
  previewOnly?: boolean;
}

export interface ExecutionPlanGenerationResult {
  plans: ExecutionPlanEntity[];
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

interface ParsedPlanInput {
  testDesignId?: string;
  executionOrder?: number;
  prerequisiteDesignIds?: string[];
  operationId?: string;
  environmentId?: string;
  datasetId?: string;
  requestTemplate?: RequestTemplate;
  runtimeBindings?: any[];
  assertions?: any[];
  cleanupSteps?: any[];
  status?: 'Pending' | 'Ready' | 'Disabled';
}

const EXECUTION_PLAN_TEMPLATE_ID = 'tmpl-execution-001';

export class GenerateExecutionPlanWithAI {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly manageAIProviders: ManageAIProviders,
    private readonly versionService: VersionService,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async execute(request: GenerateExecutionPlanWithAIRequest): Promise<ExecutionPlanGenerationResult> {
    const warnings: string[] = [];

    // 1. Validate Requirement exists
    const requirement = await this.requirementRepository.findById(request.requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${request.requirementId} not found`);
    }
    const projectId = request.projectId || requirement.projectId;

    // 2. Load approved Strategy
    const strategy = await this.testStrategyRepository.findByRequirement(request.requirementId);
    if (!strategy) {
      warnings.push('No approved test strategy found for this requirement.');
    }

    // 3. Load Test Designs
    const designs = await this.testDesignRepository.findByRequirement(request.requirementId);
    if (!designs || designs.length === 0) {
      warnings.push('No test designs found for this requirement. Execution plan generation may be incomplete.');
    }

    // 4. Load attached Assertions
    const allAssertions: Record<string, any> = {};
    for (const design of designs || []) {
      if (design.assertionIds && design.assertionIds.length > 0) {
        for (const ref of design.assertionIds) {
          if (ref.enabled !== false) {
            allAssertions[design.id] = (allAssertions[design.id] || []).concat(ref.assertionId);
          }
        }
      }
    }

    // 5. Build Project Context
    let context: any = null;
    try {
      context = await this.projectContextService.buildContext(projectId);
    } catch (err: any) {
      warnings.push(`Project context could not be built: ${err.message}`);
    }
    if (!context) warnings.push('No project context was available for execution plan generation.');

    // 6. Build prompt using existing Execution Plan template
    let builtPrompt: { systemPrompt: string; userPrompt: string; tokenEstimate: number; validationWarnings: string[] } | null = null;
    let templateFound = true;
    try {
      const preview = await this.promptBuilderService.previewPrompt({
        templateId: EXECUTION_PLAN_TEMPLATE_ID,
        projectId,
        variableOverrides: {
          requirement: requirement as any,
          designs: designs || [],
          strategy: strategy as any,
          context: context as any,
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
      warnings.push(`Execution Plan template could not be built: ${err.message}`);
    }
    if (!templateFound || !builtPrompt) {
      warnings.push('No Execution Plan prompt template was found. Using fallback prompt.');
      builtPrompt = {
        systemPrompt: 'You are an execution plan specialist.',
        userPrompt: `Create execution plans for requirement: ${requirement.title}. Test designs: ${JSON.stringify(designs || [])}`,
        tokenEstimate: 0,
        validationWarnings: ['Fallback prompt used - template not found.'],
      };
    }

    // 7. Resolve selected AI Provider
    let providerEntity;
    try {
      providerEntity = await this.manageAIProviders.getProvider(request.providerId);
    } catch (err: any) {
      throw new Error(`AI Provider could not be resolved: ${err.message}`);
    }
    if (!providerEntity.enabled) {
      warnings.push(`AI Provider "${providerEntity.name}" is disabled. Using placeholder execution plan generation.`);
    }

    const messages: AIProviderMessage[] = [
      { role: 'system', content: builtPrompt.systemPrompt },
      { role: 'user', content: builtPrompt.userPrompt },
    ];

    // 8. Generate response
    const generateResult = await this.manageAIProviders.generate(request.providerId, messages);

    if (request.previewOnly) {
      return {
        plans: [],
        preview: {
          contextSummary: this.buildContextSummary(context, requirement, strategy, designs || []),
          generatedPrompt: builtPrompt,
          tokenEstimate: generateResult.usage.totalTokens,
          costEstimate: generateResult.cost.totalCost,
        },
        warnings,
        providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
      };
    }

    // 9. Parse structured execution plan
    const parsed = this.parseStructuredResponse(generateResult.content);

    // 10. Fallback to deterministic execution plan if parsing fails
    let planInputs = parsed.plans.length > 0 ? parsed.plans : this.derivePlansFromDesigns(designs || [], requirement);

    if (parsed.plans.length === 0) {
      warnings.push('AI response did not contain valid structured JSON. Falling back to deterministic execution plan.');
    }

    // 11-16. Convert, link, preserve, and persist
    const persistedPlans: ExecutionPlanEntity[] = [];
    for (const input of planInputs) {
      const now = Date.now();
      const plan = new ExecutionPlanEntity(
        randomUUID(),
        projectId,
        request.requirementId,
        input.testDesignId || '',
        input.executionOrder || 0,
        input.prerequisiteDesignIds || [],
        input.operationId || '',
        input.environmentId || '',
        input.datasetId || '',
        input.runtimeBindings || [],
        {
          method: input.requestTemplate?.method || 'GET',
          path: input.requestTemplate?.path || '/',
          headers: input.requestTemplate?.headers,
          queryParams: input.requestTemplate?.queryParams,
          body: input.requestTemplate?.body,
        },
        input.assertions || [],
        input.cleanupSteps || [],
        input.status || 'Ready',
        now,
        now
      );

      // 16. Persist using ExecutionPlanRepository
      const saved = await this.executionPlanRepository.create(plan);

      // Publish GENERATED event through central EventPublisher.
      // The VersionEventListener will automatically create a version snapshot.
      if (this.eventPublisher) {
        await this.eventPublisher.generated('execution', saved.id, saved.projectId, 'ExecutionPlan', {
          requirementId: requirement.id,
          providerName: providerEntity.name,
          model: generateResult.model,
        } as any);
      }

      persistedPlans.push(saved);
    }

    return {
      plans: persistedPlans,
      warnings,
      providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
    };
  }

  // ---------------------------------------------------------------------
  // Parsing helpers
  // ---------------------------------------------------------------------

  private parseStructuredResponse(content: string): { plans: ParsedPlanInput[] } {
    const plans: ParsedPlanInput[] = [];
    if (!content) return { plans };

    const candidates: string[] = [content];
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);
    const braceMatch = content.match(/\[[\s\S]*\]/);
    if (braceMatch) candidates.push(braceMatch[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const rawPlans: any[] = Array.isArray(parsed)
          ? parsed
          : parsed.plans
            ? (Array.isArray(parsed.plans) ? parsed.plans : [])
            : parsed.plan
              ? [parsed.plan]
              : [];

        for (const raw of rawPlans) {
          if (!raw || typeof raw !== 'object') continue;
          plans.push({
            testDesignId: raw.testDesignId ? String(raw.testDesignId) : undefined,
            executionOrder: raw.executionOrder ? Number(raw.executionOrder) : undefined,
            prerequisiteDesignIds: Array.isArray(raw.prerequisiteDesignIds)
              ? raw.prerequisiteDesignIds.map((id: any) => String(id))
              : [],
            requestTemplate: this.normalizeRequestTemplate(raw.requestTemplate),
            runtimeBindings: this.normalizeRuntimeBindings(raw.runtimeBindings),
            assertions: this.normalizeAssertions(raw.assertions),
            cleanupSteps: this.normalizeCleanupSteps(raw.cleanupSteps),
            status: this.normalizeStatus(raw.status),
          });
        }
        if (plans.length > 0) break;
      } catch {
        // Try next candidate
      }
    }
    return { plans };
  }

  private normalizeRequestTemplate(value: any): RequestTemplate | undefined {
    if (!value || typeof value !== 'object') return undefined;
    return {
      method: String(value.method || 'GET'),
      path: String(value.path || '/'),
      headers: value.headers || {},
      queryParams: value.queryParams || {},
      body: 'body' in value ? value.body : undefined,
    };
  }

  private normalizeRuntimeBindings(value: any): any[] {
    if (!Array.isArray(value)) return [];
    return value.map((v: any) => {
      if (!v || typeof v !== 'object') return null;
      return {
        variable: String(v.variable || ''),
        source: String(v.source || 'request'),
        path: v.path ? String(v.path) : undefined,
      };
    }).filter((v): v is any => !!v);
  }

  private normalizeAssertions(value: any): any[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((v: any) => {
        if (!v || typeof v !== 'object') return null;
        const type = String(v.type || '');
        if (!['status', 'body', 'header', 'jsonPath'].includes(type)) return null;
        const operator = String(v.operator || 'equals');
        if (!['equals', 'contains', 'matches', 'exists'].includes(operator)) return null;
        return { type, operator, path: String(v.path || ''), expected: 'expected' in v ? v.expected : true };
      })
      .filter((v): v is any => !!v);
  }

  private normalizeCleanupSteps(value: any): any[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((v: any) => {
        if (!v || typeof v !== 'object') return null;
        const type = String(v.type || '');
        if (!['api', 'dataset', 'environment'].includes(type)) return null;
        return { type, action: String(v.action || ''), target: String(v.target || '') };
      })
      .filter((v): v is any => !!v);
  }

  private normalizeStatus(value: any): 'Pending' | 'Ready' | 'Disabled' {
    if (!value) return 'Ready';
    const str = String(value).toLowerCase();
    if (str.includes('pending')) return 'Pending';
    if (str.includes('disabled')) return 'Disabled';
    return 'Ready';
  }

  private derivePlansFromDesigns(designs: any[], requirement: any): ParsedPlanInput[] {
    const plans: ParsedPlanInput[] = [];
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    const sortedDesigns = [...designs].sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      return pa - pb;
    });

    for (let i = 0; i < sortedDesigns.length; i++) {
      const design = sortedDesigns[i];
      const prerequisites = this.resolvePrerequisites(design, sortedDesigns, i);

      plans.push({
        testDesignId: design.id,
        executionOrder: i + 1,
        prerequisiteDesignIds: prerequisites,
        requestTemplate: {
          method: 'GET',
          path: '/',
          headers: design.requestOverrides?.headers,
          queryParams: design.requestOverrides?.queryParams,
          body: design.requestOverrides?.body,
        },
        runtimeBindings: design.runtimeBindings || [],
        assertions: design.assertions || [],
        cleanupSteps: design.cleanup || [],
        status: design.status === 'Ready' ? 'Ready' : 'Disabled',
      });
    }

    return plans;
  }

  private resolvePrerequisites(design: any, allDesigns: any[], currentIndex: number): string[] {
    const prerequisites: string[] = [];

    // Designs with runtime bindings that source from 'response' need prerequisites
    for (const binding of design.runtimeBindings || []) {
      if (binding.source === 'response') {
        for (let j = 0; j < currentIndex; j++) {
          const prevDesign = allDesigns[j];
          if (prevDesign.assertions?.some((a: any) => a.path?.includes(binding.variable))) {
            if (!prerequisites.includes(prevDesign.id)) {
              prerequisites.push(prevDesign.id);
            }
          }
        }
      }
    }

    // Security and Authentication designs should come before Positive designs
    if (design.assertions?.some((a: any) => a.expected === 200)) {
      for (let j = 0; j < currentIndex; j++) {
        const prevDesign = allDesigns[j];
        if (prevDesign.assertions?.some((a: any) => a.expected === 401 || a.expected === 200) &&
            !prerequisites.includes(prevDesign.id)) {
          if (prevDesign.runtimeBindings?.some((b: any) => b.variable === 'accessToken')) {
            prerequisites.push(prevDesign.id);
          }
        }
      }
    }

    return prerequisites;
  }

  private buildContextSummary(context: any, requirement: any, strategy: any, designs: any[]): Record<string, any> {
    return {
      requirementId: requirement.id,
      requirementTitle: requirement.title,
      requirementCategory: requirement.category,
      strategySections: (strategy?.sections || []).length,
      strategyItems: (strategy?.sections || []).reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0),
      testDesigns: designs.length,
      apis: (context?.apis || []).length,
      apiOperations: (context?.apiOperations || []).length,
      environments: (context?.environments || []).length,
      datasets: (context?.datasets || []).length,
      runtimeVariables: (context?.runtimeVariables || []).length,
    };
  }
}

export default GenerateExecutionPlanWithAI;
