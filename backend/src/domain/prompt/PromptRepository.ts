// PromptRepository - Domain Repository interface for Prompt Framework
// Handles persistence operations for PromptEntity and PromptTemplateEntity.

import { PromptEntity } from './PromptEntity.js';
import { PromptTemplateEntity, PromptTemplateCategory } from './PromptTemplateEntity.js';

export interface PromptRepository {
  // Prompt persistence
  createPrompt(prompt: PromptEntity): Promise<PromptEntity>;
  findById(id: string): Promise<PromptEntity | null>;
  findByProject(projectId: string): Promise<PromptEntity[]>;
  findByTemplate(templateId: string): Promise<PromptEntity[]>;
  list(): Promise<PromptEntity[]>;
  delete(id: string): Promise<void>;

  // Template persistence
  createTemplate(template: PromptTemplateEntity): Promise<PromptTemplateEntity>;
  findTemplateById(id: string): Promise<PromptTemplateEntity | null>;
  findTemplatesByProject(projectId: string | null): Promise<PromptTemplateEntity[]>;
  findTemplatesByCategory(category: PromptTemplateCategory): Promise<PromptTemplateEntity[]>;
  findEnabledTemplates(): Promise<PromptTemplateEntity[]>;
  findTemplatesByProjectAndCategory(
    projectId: string | null,
    category: PromptTemplateCategory
  ): Promise<PromptTemplateEntity[]>;
  updateTemplate(id: string, updates: Partial<PromptTemplateEntity>): Promise<PromptTemplateEntity | null>;
  deleteTemplate(id: string): Promise<void>;
  listTemplates(): Promise<PromptTemplateEntity[]>;
}

export default PromptRepository;
