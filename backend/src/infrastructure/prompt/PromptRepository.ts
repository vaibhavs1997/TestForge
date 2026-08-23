// PromptRepository - In-memory implementation of Prompt Repository
// Persists PromptEntity and PromptTemplateEntity in memory.
// Can be swapped for DB/file-based implementation.

import { PromptRepository as IPromptRepository } from '../../domain/prompt/index.js';
import { PromptEntity, PromptVariableValue, PromptStatus } from '../../domain/prompt/index.js';
import {
  PromptTemplateEntity,
  PromptTemplateCategory,
  PromptTemplateVariable,
} from '../../domain/prompt/index.js';
import { BUILTIN_TEMPLATES, seedBuiltinTemplates } from './builtinTemplates.js';

export class PromptRepository implements IPromptRepository {
  private prompts: Map<string, PromptEntity> = new Map();
  private templates: Map<string, PromptTemplateEntity> = new Map();
  private projectPrompts: Map<string, Set<string>> = new Map();
  private seeded = false;

  constructor(private readonly projectId?: string) {
    // Seeded with built-in templates lazily
  }

  private ensureSeeded(): void {
    if (this.seeded) return;
    this.seeded = true;
    seedBuiltinTemplates(this);
  }

  // ---- Prompt persistence ----
  async createPrompt(prompt: PromptEntity): Promise<PromptEntity> {
    this.prompts.set(prompt.id, prompt);

    if (!this.projectPrompts.has(prompt.projectId)) {
      this.projectPrompts.set(prompt.projectId, new Set());
    }
    this.projectPrompts.get(prompt.projectId)!.add(prompt.id);

    return prompt;
  }

  async findById(id: string): Promise<PromptEntity | null> {
    return this.prompts.get(id) || null;
  }

  async findByProject(projectId: string): Promise<PromptEntity[]> {
    const promptIds = this.projectPrompts.get(projectId);
    if (!promptIds) {
      return [];
    }
    return Array.from(promptIds)
      .map((id) => this.prompts.get(id))
      .filter((p): p is PromptEntity => p !== undefined)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async findByTemplate(templateId: string): Promise<PromptEntity[]> {
    return Array.from(this.prompts.values())
      .filter((p) => p.templateId === templateId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async list(): Promise<PromptEntity[]> {
    return Array.from(this.prompts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async delete(id: string): Promise<void> {
    const prompt = this.prompts.get(id);
    if (!prompt) {
      return;
    }
    this.prompts.delete(id);
    const projectPrompts = this.projectPrompts.get(prompt.projectId);
    if (projectPrompts) {
      projectPrompts.delete(id);
    }
  }

  // ---- Template persistence ----
  async createTemplate(template: PromptTemplateEntity): Promise<PromptTemplateEntity> {
    this.ensureSeeded();
    this.templates.set(template.id, template);
    return template;
  }

  async findTemplateById(id: string): Promise<PromptTemplateEntity | null> {
    this.ensureSeeded();
    return this.templates.get(id) || null;
  }

  async findTemplatesByProject(projectId: string | null): Promise<PromptTemplateEntity[]> {
    this.ensureSeeded();
    if (projectId === null) {
      // Return global (project-agnostic) templates
      return Array.from(this.templates.values()).filter((t) => t.projectId === null);
    }
    return Array.from(this.templates.values())
      .filter((t) => t.projectId === null || t.projectId === projectId)
      .sort((a, b) => a.version - b.version);
  }

  async findTemplatesByCategory(category: PromptTemplateCategory): Promise<PromptTemplateEntity[]> {
    this.ensureSeeded();
    return Array.from(this.templates.values()).filter((t) => t.category === category);
  }

  async findEnabledTemplates(): Promise<PromptTemplateEntity[]> {
    this.ensureSeeded();
    return Array.from(this.templates.values()).filter((t) => t.enabled);
  }

  async findTemplatesByProjectAndCategory(
    projectId: string | null,
    category: PromptTemplateCategory
  ): Promise<PromptTemplateEntity[]> {
    this.ensureSeeded();
    return Array.from(this.templates.values()).filter(
      (t) =>
        (t.projectId === null || t.projectId === projectId) &&
        t.category === category &&
        t.enabled
    );
  }

  async updateTemplate(
    id: string,
    updates: Partial<PromptTemplateEntity>
  ): Promise<PromptTemplateEntity | null> {
    this.ensureSeeded();
    const existing = this.templates.get(id);
    if (!existing) {
      return null;
    }
    const updated = new PromptTemplateEntity(
      existing.id,
      updates.projectId ?? existing.projectId,
      updates.name ?? existing.name,
      updates.description ?? existing.description,
      updates.category ?? existing.category,
      updates.systemPrompt ?? existing.systemPrompt,
      updates.userPrompt ?? existing.userPrompt,
      updates.variables ?? existing.variables,
      updates.enabled ?? existing.enabled,
      updates.version ?? existing.version,
      existing.createdAt,
      Date.now()
    );
    this.templates.set(id, updated);
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    this.ensureSeeded();
    this.templates.delete(id);
  }

  async listTemplates(): Promise<PromptTemplateEntity[]> {
    this.ensureSeeded();
    return Array.from(this.templates.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  // Expose built-in templates for reference
  getBuiltinTemplates(): typeof BUILTIN_TEMPLATES {
    return BUILTIN_TEMPLATES;
  }
}

export default PromptRepository;
