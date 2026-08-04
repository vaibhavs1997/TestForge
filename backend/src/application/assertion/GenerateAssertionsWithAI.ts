// GenerateAssertionsWithAI - Application Use Case
// Generates AssertionEntity objects using the AI Provider Framework.
// Reuses existing services and repositories. No new AI framework.

import { randomUUID } from 'node:crypto';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import type { AssertionEntity } from '../../domain/assertion/AssertionEntity';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository';
import { TestDesignEntity } from '../../domain/requirements/TestDesignEntity';
import { ProjectContextService } from '../context/ProjectContextService';
import { PromptBuilderService } from '../prompt/PromptBuilderService';
import { ManageAIProviders } from '../ai-provider/ManageAIProviders';
import { VersionService } from '../versioning/VersionService';
import type { AIProviderMessage } from '../../domain/ai-provider';

export interface GenerateAssertionsWithAIRequest {
  projectId: string;
  testDesignId: string;
  providerId: string;
  previewOnly?: boolean;
}

export interface AssertionGenerationResult {
  assertions: AssertionEntity[];
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

const ASSERTION_TEMPLATE_ID = 'tmpl-assertion-001';

export class GenerateAssertionsWithAI {
  constructor(
    private readonly assertionRepository: AssertionRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly manageAIProviders: ManageAIProviders,
    private readonly versionService: VersionService
  ) {}

  async execute(request: GenerateAssertionsWithAIRequest): Promise<AssertionGenerationResult> {
    const warnings: string[] = [];

    const testDesign = await this.testDesignRepository.findById(request.testDesignId);
    if (!testDesign) {
      throw new Error(`Test Design with id ${request.testDesignId} not found`);
    }
    const projectId = request.projectId || testDesign.projectId;

    let context: any = null;
    try {
      context = await this.projectContextService.buildContext(projectId);
    } catch (err: any) {
      warnings.push(`Project context could not be built: ${err.message}`);
    }
    if (!context) warnings.push('No project context was available for assertion generation.');

    let providerEntity;
    try {
      providerEntity = await this.manageAIProviders.getProvider(request.providerId);
    } catch (err: any) {
      throw new Error(`AI Provider could not be resolved: ${err.message}`);
    }
    if (!providerEntity.enabled) {
      warnings.push(`AI Provider "${providerEntity.name}" is disabled. Using placeholder assertion generation.`);
    }

    let builtPrompt: { systemPrompt: string; userPrompt: string; tokenEstimate: number; validationWarnings: string[] } | null = null;
    let templateFound = true;
    try {
      const preview = await this.promptBuilderService.previewPrompt({
        templateId: ASSERTION_TEMPLATE_ID,
        projectId,
        variableOverrides: { testDesign: testDesign as any, context: context as any },
      });
      builtPrompt = {
        systemPrompt: preview.systemPrompt,
        userPrompt: preview.userPrompt,
        tokenEstimate: preview.tokenEstimate,
        validationWarnings: preview.validationWarnings,
      };
    } catch (err: any) {
      templateFound = false;
      warnings.push(`Assertion template could not be built: ${err.message}`);
    }
    if (!templateFound || !builtPrompt) {
      warnings.push('No Assertion prompt template was found. Using fallback prompt.');
      builtPrompt = {
        systemPrompt: 'You are an assertion specialist.',
        userPrompt: `Create assertions for the test design: ${testDesign.id}.`,
        tokenEstimate: 0,
        validationWarnings: ['Fallback prompt used - template not found.'],
      };
    }

    const messages: AIProviderMessage[] = [
      { role: 'system', content: builtPrompt.systemPrompt },
      { role: 'user', content: builtPrompt.userPrompt },
    ];
    const generateResult = await this.manageAIProviders.generate(request.providerId, messages);

    if (request.previewOnly) {
      return {
        assertions: [],
        preview: {
          contextSummary: this.buildContextSummary(context, testDesign),
          generatedPrompt: builtPrompt,
          tokenEstimate: generateResult.usage.totalTokens,
          costEstimate: generateResult.cost.totalCost,
        },
        warnings,
        providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
      };
    }

    const parsed = this.parseStructuredResponse(generateResult.content);
    const assertionInputs = parsed.assertions.length > 0 ? parsed.assertions : this.deriveAssertionsFromTestDesign(testDesign);

    const persistedAssertions: AssertionEntity[] = [];
    for (const input of assertionInputs) {
      const now = Date.now();
      const assertion = {
        id: randomUUID(),
        projectId,
        name: input.name || `AI Generated Assertion ${persistedAssertions.length + 1}`,
        description: input.description || 'Generated by AI',
        category: input.category || 'AI Generated',
        enabled: input.enabled ?? true,
        type: input.type,
        operator: input.operator,
        expression: input.path,
        expectedValue: input.expected,
        severity: 'Major' as const,
        tags: input.tags || [],
        createdAt: now,
        updatedAt: now,
      };

      const saved = await this.assertionRepository.create(assertion);
      try {
        await this.versionService.create({
          projectId,
          entityType: 'Assertion' as any,
          entityId: saved.id,
          snapshot: saved as any,
          changeSummary: `Assertion generated by AI (${providerEntity.name}) for test design ${testDesign.id}`,
          createdBy: 'AI',
        });
      } catch {
        // Versioning is best-effort
      }
      persistedAssertions.push(saved);
    }

    // Attach generated assertion IDs to the existing Test Design
    const designUpdatedAt = Date.now();
    const updatedDesign = new TestDesignEntity(
      testDesign.id,
      testDesign.projectId,
      testDesign.requirementId,
      testDesign.strategyItemId,
      testDesign.operationId,
      testDesign.environmentId,
      testDesign.datasetId,
      testDesign.datasetRowReference,
      testDesign.requestOverrides,
      testDesign.runtimeBindings,
      [...testDesign.assertions, ...persistedAssertions.map(a => ({ assertionId: a.id }))],
      testDesign.cleanup,
      testDesign.priority,
      testDesign.status,
      testDesign.createdAt,
      designUpdatedAt
    );
    await this.testDesignRepository.update(testDesign.id, updatedDesign as any);

    return {
      assertions: persistedAssertions,
      warnings,
      providerUsed: { id: providerEntity.id, name: providerEntity.name, provider: providerEntity.provider, model: generateResult.model },
    };
  }

  private parseStructuredResponse(content: string): { assertions: any[] } {
    const assertions: any[] = [];
    if (!content) return { assertions };

    const candidates: string[] = [content];
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch && fenceMatch[1]) candidates.push(fenceMatch[1]);
    const braceMatch = content.match(/\[[\s\S]*\]/);
    if (braceMatch) candidates.push(braceMatch[0]);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const rawAssertions = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.assertions) ? parsed.assertions : []);
        for (const raw of rawAssertions) {
          if (!raw || typeof raw !== 'object') continue;
          assertions.push({
            name: raw.name ? String(raw.name) : '',
            description: raw.description ? String(raw.description) : '',
            category: raw.category ? String(raw.category) : 'AI Generated',
            type: String(raw.type || 'status'),
            operator: String(raw.operator || 'equals'),
            path: String(raw.path || ''),
            expected: 'expected' in raw ? raw.expected : true,
            enabled: raw.enabled ?? true,
            tags: Array.isArray(raw.tags) ? raw.tags.map((t: any) => String(t)) : [],
          });
        }
        if (assertions.length > 0) break;
      } catch {
        // Try next candidate
      }
    }
    return { assertions };
  }

  private deriveAssertionsFromTestDesign(testDesign: TestDesignEntity): any[] {
    const assertions: any[] = [];
    assertions.push({
      name: `Status Check for ${testDesign.id.slice(0, 8)}`,
      description: 'Validate HTTP status code',
      category: 'Functional',
      type: 'status',
      operator: 'equals',
      path: '$.status',
      expected: 200,
      enabled: true,
      tags: ['functional', 'auto-generated'],
    });
    if (testDesign.requestOverrides?.body) {
      assertions.push({
        name: `Body Validation for ${testDesign.id.slice(0, 8)}`,
        description: 'Validate response body exists',
        category: 'Functional',
        type: 'body',
        operator: 'exists',
        path: '$.data',
        expected: true,
        enabled: true,
        tags: ['functional', 'auto-generated'],
      });
    }
    return assertions;
  }

  private buildContextSummary(context: any, testDesign: TestDesignEntity): Record<string, any> {
    return {
      testDesignId: testDesign.id,
      operationId: testDesign.operationId,
      environmentId: testDesign.environmentId,
      datasetId: testDesign.datasetId,
      apis: (context?.apis || []).length,
      apiOperations: (context?.apiOperations || []).length,
      environments: (context?.environments || []).length,
      datasets: (context?.datasets || []).length,
      runtimeVariables: (context?.runtimeVariables || []).length,
    };
  }
}

export default GenerateAssertionsWithAI;