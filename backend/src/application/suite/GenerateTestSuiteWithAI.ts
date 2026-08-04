// GenerateTestSuiteWithAI - Application Use Case
// Generates TestSuiteEntity entities using the AI Provider Framework.
// Reuses existing services and repositories. No new AI framework.

import { randomUUID } from 'node:crypto';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository';
import { TestSuiteEntity, SuiteExecutionPolicy, SuiteStatus, SuiteTag, TestSuiteItem } from '../../domain/suite/TestSuiteEntity';
import { ProjectContextService } from '../context/ProjectContextService';
import { PromptBuilderService } from '../prompt/PromptBuilderService';
import { ManageAIProviders } from '../ai-provider/ManageAIProviders';
import { VersionService } from '../versioning/VersionService';
import type { AIProviderMessage } from '../../domain/ai-provider';

export interface GenerateTestSuiteWithAIRequest {
  projectId: string;
  providerId: string;
  previewOnly?: boolean;
}

export interface TestSuiteGenerationResult {
  suites: TestSuiteEntity[];
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

interface ParsedSuiteInput {
  name?: string;
  description?: string;
  tags?: string[];
  executionPlanIds?: string[];
  defaultEnvironmentId?: string;
  executionPolicy?: 'Sequential' | 'FailFast' | 'ContinueOnError';
  estimatedDuration?: number;
  status?: 'Draft' | 'Active' | 'Archived';
}

const TEST_SUITE_TEMPLATE_ID = 'tmpl-suite-001';

export class GenerateTestSuiteWithAI {
  constructor(
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly testSuiteRepository: TestSuiteRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly manageAIProviders: ManageAIProviders,
    private readonly versionService: VersionService
  ) {}

  async execute(request: GenerateTestSuiteWithAIRequest): Promise<TestSuiteGenerationResult> {
    const warnings: string[] = [];
    const projectId = request.projectId;

    // 1. Load Execution Plans
    const executionPlans = await this.executionPlanRepository.findByProject(projectId);
    if (!executionPlans || executionPlans.length === 0) {
      warnings.push('No execution plans found for this project. Suite generation may be empty.');
    }

    // 2. Build Project Context
    let context: any = null;
    try {
      context = await this.projectContextService.buildContext(projectId);
    } catch (err: any) {
      warnings.push(`Project context could not be built: ${err.message}`);
    }
    if (!context) warnings.push('No project context was available for suite generation.');

    // 3. Build prompt using the Test Suite template
    let builtPrompt: { systemPrompt: string; userPrompt: string; tokenEstimate: number; validationWarnings: string[] } | null = null;
    let templateFound = true;
    try {
      const preview = await this.promptBuilderService.previewPrompt({
        templateId: TEST_SUITE_TEMPLATE_ID,
        projectId,
        variableOverrides: {
          executionPlans: executionPlans || [],
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
      warnings.push(`Test Suite template could not be built: ${err.message}`);
    }
    if (!templateFound || !builtPrompt) {
      warnings.push('No Test Suite prompt template was found. Using fallback prompt.');
      builtPrompt = {
        systemPrompt: 'You are a test suite specialist.',
        userPrompt: `Create test suites grouping execution plans: ${JSON.stringify(executionPlans || [])}`,
        tokenEstimate: 0,
        validationWarnings: ['Fallback prompt used - template not found.'],
      };
    }

    // 4. Resolve selected AI Provider
    let providerEntity;
    try {
      providerEntity = await this.manageAIProviders.getProvider(request.providerId);
    } catch (err: any) {
      throw new Error(`AI Provider could not be resolved: ${err.message}`);
    }
    if (!providerEntity.enabled) {
      warnings.push(`AI Provider "${providerEntity.name}" is disabled. Using placeholder suite generation.`);
    }

    const messages: AIProviderMessage[] = [
      { role: 'system', content: builtPrompt.systemPrompt },
      { role: 'user', content: builtPrompt.userPrompt },
    ];

    // 5. Generate response
    const generateResult = await this.manageAIProviders.generate(request.providerId, messages);

    if (request.previewOnly) {
      return {
        suites: [],
        preview: {
          contextSummary: this.buildContextSummary(context, executionPlans || []),
          generatedPrompt: builtPrompt,
          tokenEstimate: generateResult.usage.totalTokens,
          costEstimate: generateResult.cost.totalCost,
        },
        warnings,
        providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
      };
    }

    // 6. Parse suite JSON
    const parsed = this.parseStructuredResponse(generateResult.content);

    // 7-12. Fallback grouping if parsing fails
    let suiteInputs = parsed.suites.length > 0 ? parsed.suites : this.deriveSuitesFromPlans(executionPlans || []);

    if (parsed.suites.length === 0) {
      warnings.push('AI response did not contain valid structured JSON. Falling back to deterministic suite grouping.');
    }

    const allPlanIds = new Set((executionPlans || []).map(p => p.id));
    const persistedSuites: TestSuiteEntity[] = [];
    for (const input of suiteInputs) {
      const now = Date.now();

      // Filter execution plan ids to only those that exist
      const planIds = (input.executionPlanIds || []).filter(id => allPlanIds.has(id));

      const executionPlansForSuite: TestSuiteItem[] = planIds.map((executionPlanId, index) => ({
        executionPlanId,
        order: index + 1,
      }));

      const tags: SuiteTag[] = (input.tags || []).map((name, index) => ({
        id: randomUUID(),
        name,
      }));

      const executionPolicy: SuiteExecutionPolicy = this.normalizePolicy(input.executionPolicy);
      const status: SuiteStatus = this.normalizeStatus(input.status);
      const estimatedDuration = input.estimatedDuration || this.estimateDuration(planIds, executionPlans || []);

      const suite = new TestSuiteEntity(
        randomUUID(),
        projectId,
        input.name || `Test Suite ${now}`,
        input.description || '',
        tags,
        executionPlansForSuite,
        input.defaultEnvironmentId || '',
        executionPolicy,
        estimatedDuration,
        status,
        now,
        now
      );

      // 11. Persist using existing TestSuiteRepository
      const saved = await this.testSuiteRepository.create(suite);

      // 12. Create Version entries
      try {
        await this.versionService.create({
          projectId,
          entityType: 'TestSuite' as any,
          entityId: saved.id,
          snapshot: saved as any,
          changeSummary: `Test suite generated by AI (${providerEntity.name})`,
          createdBy: 'AI',
        });
      } catch {
        // Versioning is best-effort
      }
      persistedSuites.push(saved);
    }

    return {
      suites: persistedSuites,
      warnings,
      providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
    };
  }

  // ---------------------------------------------------------------------
  // Parsing helpers
  // ---------------------------------------------------------------------

  private parseStructuredResponse(content: string): { suites: ParsedSuiteInput[] } {
    const suites: ParsedSuiteInput[] = [];
    if (!content) return { suites };

    const candidates: string[] = [content];
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);
    const braceMatch = content.match(/\[[\s\S]*\]/);
    if (braceMatch) candidates.push(braceMatch[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const rawSuites: any[] = Array.isArray(parsed)
          ? parsed
          : parsed.suites
            ? (Array.isArray(parsed.suites) ? parsed.suites : [])
            : parsed.suite
              ? [parsed.suite]
              : [];

        for (const raw of rawSuites) {
          if (!raw || typeof raw !== 'object') continue;
          suites.push({
            name: raw.name ? String(raw.name) : undefined,
            description: raw.description ? String(raw.description) : undefined,
            tags: Array.isArray(raw.tags) ? raw.tags.map((t: any) => String(t)).filter(Boolean) : undefined,
            executionPlanIds: Array.isArray(raw.executionPlanIds)
              ? raw.executionPlanIds.map((id: any) => String(id)).filter(Boolean)
              : Array.isArray(raw.executionPlans)
                ? raw.executionPlans.map((p: any) => typeof p === 'string' ? p : String(p?.executionPlanId || p?.id || '')).filter(Boolean)
                : undefined,
            defaultEnvironmentId: raw.defaultEnvironmentId ? String(raw.defaultEnvironmentId) : undefined,
            executionPolicy: this.normalizePolicy(raw.executionPolicy),
            estimatedDuration: raw.estimatedDuration ? Number(raw.estimatedDuration) : undefined,
            status: this.normalizeStatus(raw.status),
          });
        }
        if (suites.length > 0) break;
      } catch {
        // Try next candidate
      }
    }
    return { suites };
  }

  private normalizePolicy(value: any): SuiteExecutionPolicy {
    if (!value) return 'Sequential';
    const str = String(value).toLowerCase();
    if (str.includes('fail')) return 'FailFast';
    if (str.includes('continue')) return 'ContinueOnError';
    return 'Sequential';
  }

  private normalizeStatus(value: any): SuiteStatus {
    if (!value) return 'Draft';
    const str = String(value).toLowerCase();
    if (str.includes('active')) return 'Active';
    if (str.includes('archiv')) return 'Archived';
    return 'Draft';
  }

  /**
   * Fallback: group execution plans deterministically by Requirement, Priority, and API Service.
   */
  private deriveSuitesFromPlans(executionPlans: any[]): ParsedSuiteInput[] {
    const suites: ParsedSuiteInput[] = [];
    if (!executionPlans || executionPlans.length === 0) return suites;

    // Group by requirement
    const byRequirement = new Map<string, any[]>();
    for (const plan of executionPlans) {
      const key = plan.requirementId || 'unassigned';
      if (!byRequirement.has(key)) byRequirement.set(key, []);
      byRequirement.get(key)!.push(plan);
    }

    for (const [requirementId, plans] of byRequirement) {
      // Within a requirement, group by priority (via testDesignId lookup is unavailable;
      // instead use executionOrder to determine deterministic priority ordering)
      const sortedPlans = [...plans].sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0));

      // Further group by API service if available (derive from requestTemplate.path prefix)
      const byService = new Map<string, any[]>();
      for (const plan of sortedPlans) {
        const service = this.resolveServiceFromPlan(plan);
        if (!byService.has(service)) byService.set(service, []);
        byService.get(service)!.push(plan);
      }

      for (const [service, servicePlans] of byService) {
        const planIds = [...servicePlans].map(p => p.id);
        const primaryEnvironment = this.detectPrimaryEnvironment(servicePlans);
        const name = this.buildSuiteName(requirementId, service, servicePlans);
        suites.push({
          name,
          description: `Auto-grouped suite for requirement ${requirementId}${service ? ` (${service})` : ''}.`,
          tags: this.buildTags(requirementId, service),
          executionPlanIds: planIds,
          defaultEnvironmentId: primaryEnvironment,
          executionPolicy: 'Sequential',
          estimatedDuration: this.estimateDuration(planIds, executionPlans),
          status: 'Draft',
        });
      }
    }

    return suites;
  }

  private resolveServiceFromPlan(plan: any): string {
    const path = plan.requestTemplate?.path || '';
    if (path) {
      const segments = path.split('/').filter(Boolean);
      if (segments.length > 0) return segments[0];
    }
    return '';
  }

  private detectPrimaryEnvironment(plans: any[]): string {
    const counts = new Map<string, number>();
    for (const plan of plans) {
      const env = plan.environmentId || '';
      if (env) counts.set(env, (counts.get(env) || 0) + 1);
    }
    let best = '';
    let bestCount = 0;
    for (const [env, count] of counts) {
      if (count > bestCount) {
        best = env;
        bestCount = count;
      }
    }
    return best;
  }

  private buildSuiteName(requirementId: string, service: string, plans: any[]): string {
    const count = plans.length;
    if (service) {
      return `Suite - ${service} (${count} plans)` + (requirementId !== 'unassigned' ? ` - Req ${requirementId.slice(0, 8)}` : '');
    }
    return requirementId !== 'unassigned'
      ? `Suite - Req ${requirementId.slice(0, 8)} (${count} plans)`
      : `Suite - Unassigned (${count} plans)`;
  }

  private buildTags(requirementId: string, service: string): string[] {
    const tags: string[] = ['Auto'];
    if (requirementId !== 'unassigned') tags.push('AI-Generated');
    if (service) tags.push(service);
    return tags;
  }

  private estimateDuration(planIds: string[], executionPlans: any[]): number {
    let duration = 0;
    for (const plan of executionPlans) {
      if (planIds.includes(plan.id)) {
        duration += plan.estimatedDuration || 2;
      }
    }
    return duration;
  }

  private buildContextSummary(context: any, executionPlans: any[]): Record<string, any> {
    const requirements = new Set(executionPlans.map(p => p.requirementId).filter(Boolean));
    const services = new Set(executionPlans.map(p => this.resolveServiceFromPlan(p)).filter(Boolean));
    return {
      executionPlans: executionPlans.length,
      requirementsCovered: requirements.size,
      apiServicesDetected: services.size,
      environments: (context?.environments || []).length,
      datasets: (context?.datasets || []).length,
    };
  }
}

export default GenerateTestSuiteWithAI;