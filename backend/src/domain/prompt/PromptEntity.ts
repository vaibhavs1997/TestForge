// PromptEntity - Domain Entity for Generated Prompts
// Represents a prompt built from a template and project context.
// Persisted for history/auditing. No LLM execution.

import { PromptTemplateEntity } from './PromptTemplateEntity.js';

export interface PromptVariableValue {
  name: string;
  value: any;
  resolved: boolean;
  source: string;
}

export type PromptStatus = 'Draft' | 'Built' | 'Validated' | 'Invalid';

export class PromptEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly templateId: string,
    public readonly name: string,
    public readonly category: PromptTemplateEntity['category'],
    public readonly systemPrompt: string,
    public readonly userPrompt: string,
    public readonly variables: PromptVariableValue[],
    public readonly status: PromptStatus,
    public readonly tokenEstimate: number,
    public readonly validationWarnings: string[],
    public readonly createdAt: number,
    public readonly updatedAt: number,
    public readonly createdBy: string
  ) {}
}

export default PromptEntity;
