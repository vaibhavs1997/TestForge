// PromptBuilderService - Application Service for Prompt Builder
// Converts the aggregate Project Context into optimized, deterministic prompts.
// Reuses ProjectContextService and the Plugin/Provider/Versioning frameworks.
// Does NOT call any LLM. Does NOT generate requirements, tests, or reports.

import { randomUUID } from 'node:crypto';
import {
  PromptTemplateEntity,
  PromptTemplateCategory,
  PromptTemplateVariable,
} from '../../domain/prompt/index.js';
import { PromptEntity, PromptVariableValue, PromptStatus } from '../../domain/prompt/index.js';
import { PromptRepository } from '../../domain/prompt/index.js';
import { ProjectContextService } from '../context/ProjectContextService.js';
import { VersionService } from '../versioning/VersionService.js';
import { EventPublisher } from '../EventPublisher.js';

export interface BuildPromptInput {
  templateId: string;
  projectId: string;
  customVariables?: Record<string, any>;
  createdBy?: string;
}

export interface PreviewPromptInput {
  templateId: string;
  projectId: string | null;
  systemPromptOverride?: string;
  userPromptOverride?: string;
  variableOverrides?: Record<string, any>;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  variables: PromptVariableValue[];
  tokenEstimate: number;
  validationWarnings: string[];
  status: PromptStatus;
}

export class PromptBuilderService {
  constructor(
    private readonly promptRepository: PromptRepository,
    private readonly projectContextService: ProjectContextService,
    private readonly versionService: VersionService,
    private readonly eventPublisher?: EventPublisher
  ) {}

  /**
   * List available prompt templates for a project (global + project-specific).
   */
  async listTemplates(projectId: string | null): Promise<PromptTemplateEntity[]> {
    return this.promptRepository.findTemplatesByProject(projectId);
  }

  /**
   * Get a single template by id.
   */
  async getTemplate(templateId: string): Promise<PromptTemplateEntity> {
    const template = await this.promptRepository.findTemplateById(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }
    return template;
  }

  /**
   * Build a prompt from a template and the project context.
   * Replaces {{variable}} placeholders with context data.
   * Persists the built prompt and creates a version snapshot.
   * Does NOT call any LLM.
   */
  async buildPrompt(input: BuildPromptInput): Promise<PromptEntity> {
    const template = await this.getTemplate(input.templateId);
    const context = await this.projectContextService.buildContext(input.projectId);

    const built = this.renderTemplate(template, context, input.customVariables || {});

    const now = Date.now();
    const prompt = new PromptEntity(
      randomUUID(),
      input.projectId,
      input.templateId,
      template.name,
      template.category,
      built.systemPrompt,
      built.userPrompt,
      built.variables,
      built.status,
      built.tokenEstimate,
      built.validationWarnings,
      now,
      now,
      input.createdBy || 'System'
    );

    // Persist the generated prompt
    const saved = await this.promptRepository.createPrompt(prompt);

    // Publish CREATED event through central EventPublisher.
    // The VersionEventListener will automatically create a version snapshot.
    if (this.eventPublisher) {
      await this.eventPublisher.created('prompt', prompt.id, input.projectId, 'Prompt', {
        templateId: template.id,
        templateName: template.name,
        templateVersion: template.version,
        status: built.status,
        tokenEstimate: built.tokenEstimate,
      } as any);
    }

    return saved;
  }

  /**
   * Preview a prompt without persisting.
   * Reuses the same rendering logic as buildPrompt.
   */
  async previewPrompt(input: PreviewPromptInput): Promise<BuiltPrompt> {
    const template = await this.getTemplate(input.templateId);

    // If overrides are provided, use them; otherwise use the template as-is
    const effectiveTemplate = {
      ...template,
      systemPrompt: input.systemPromptOverride ?? template.systemPrompt,
      userPrompt: input.userPromptOverride ?? template.userPrompt,
      variables: template.variables,
    };

    let context = null;
    if (input.projectId) {
      context = await this.projectContextService.buildContext(input.projectId);
    }

    return this.renderTemplate(effectiveTemplate, context, input.variableOverrides || {});
  }

  /**
   * List all built prompts for a project.
   */
  async listPrompts(projectId: string): Promise<PromptEntity[]> {
    return this.promptRepository.findByProject(projectId);
  }

  /**
   * List prompts built from a specific template.
   */
  async listPromptsByTemplate(templateId: string): Promise<PromptEntity[]> {
    return this.promptRepository.findByTemplate(templateId);
  }

  /**
   * Get a single built prompt by id.
   */
  async getPrompt(promptId: string): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findById(promptId);
    if (!prompt) {
      throw new Error(`Prompt with id ${promptId} not found`);
    }
    return prompt;
  }

  /**
   * Delete a built prompt.
   */
  async deletePrompt(promptId: string): Promise<void> {
    await this.promptRepository.delete(promptId);
  }

  /**
   * Render a template by replacing {{variable}} placeholders with context values.
   * Resolves variables from the project context using the sourcePath defined on each variable.
   */
  private renderTemplate(
    template: {
      systemPrompt: string;
      userPrompt: string;
      variables: PromptTemplateVariable[];
    },
    context: any,
    customVariables: Record<string, any>
  ): BuiltPrompt {
    const variableValues: PromptVariableValue[] = [];
    const validationWarnings: string[] = [];

    // Resolve each variable from context or custom overrides
    for (const variable of template.variables) {
      let value: any;
      let resolved = false;
      let source = '';

      // Priority 1: custom override
      if (variable.name in customVariables) {
        value = customVariables[variable.name];
        resolved = true;
        source = 'custom';
      }
      // Priority 2: project context
      else if (context && variable.sourcePath) {
        value = this.resolvePath(context, variable.sourcePath);
        if (value !== undefined) {
          resolved = true;
          source = `context:${variable.sourcePath}`;
        }
      }

      variableValues.push({
        name: variable.name,
        value,
        resolved,
        source,
      });

      // Validation: required variables must be resolved
      if (variable.required && !resolved) {
        validationWarnings.push(
          `Required variable "${variable.name}" could not be resolved from context or overrides.`
        );
      }
    }

    // Replace placeholders in systemPrompt and userPrompt
    const systemPrompt = this.replacePlaceholders(template.systemPrompt, variableValues, context, customVariables);
    const userPrompt = this.replacePlaceholders(template.userPrompt, variableValues, context, customVariables);

    // Token estimation (1 token ~= 4 characters for English text)
    const fullText = systemPrompt + '\n' + userPrompt;
    const tokenEstimate = Math.ceil(fullText.length / 4);

    // Determine status
    let status: PromptStatus = 'Built';
    if (variableValues.some((v) => v.resolved === false && v.name)) {
      status = 'Draft';
    }
    if (validationWarnings.length > 0) {
      status = 'Invalid';
    }
    if (variableValues.every((v) => v.resolved) && validationWarnings.length === 0) {
      status = 'Validated';
    }

    return {
      systemPrompt,
      userPrompt,
      variables: variableValues,
      tokenEstimate,
      validationWarnings,
      status,
    };
  }

  /**
   * Replace {{variableName}} placeholders in a string with resolved values.
   */
  private replacePlaceholders(
    templateStr: string,
    variableValues: PromptVariableValue[],
    context: any,
    customVariables: Record<string, any>
  ): string {
    return templateStr.replace(/\{\{([^}]+)\}\}/g, (match, varName: string) => {
      const trimmed = varName.trim();
      // Check custom variables first
      if (trimmed in customVariables) {
        return this.safeStringify(customVariables[trimmed]);
      }
      // Check resolved variable values
      const varValue = variableValues.find((v) => v.name === trimmed);
      if (varValue && varValue.resolved) {
        return this.safeStringify(varValue.value);
      }
      // Check context paths for any non-declared placeholders
      if (context) {
        const ctxValue = this.resolvePath(context, trimmed);
        if (ctxValue !== undefined) {
          return this.safeStringify(ctxValue);
        }
      }
      // Leave placeholder as-is if unresolved
      return match;
    });
  }

  /**
   * Resolve a dot-path within an object. e.g. "statistics.totalEntities"
   */
  private resolvePath(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((current: any, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Safely convert any value to a string for placeholder replacement.
   */
  private safeStringify(value: any): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }

  /**
   * Estimate tokens for a given text string (approximate: 1 token ~= 4 chars).
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

export default PromptBuilderService;
