// PromptTemplateEntity - Domain Entity for Prompt Templates
// Defines deterministic, reusable prompt structures.
// No LLM invocation. Purely template construction.

export type PromptTemplateCategory =
  | 'Requirement Generation'
  | 'Test Strategy'
  | 'Test Design'
  | 'Assertion Generation'
  | 'Test Data Generation'
  | 'Failure Analysis'
  | 'Report Summary'
  | 'Custom';

export interface PromptTemplateVariable {
  name: string;
  description: string;
  required: boolean;
  sourcePath: string; // path within the ProjectContext to pull the value from
}

export class PromptTemplateEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string | null,
    public readonly name: string,
    public readonly description: string,
    public readonly category: PromptTemplateCategory,
    public readonly systemPrompt: string,
    public readonly userPrompt: string,
    public readonly variables: PromptTemplateVariable[],
    public readonly enabled: boolean,
    public readonly version: number,
    public readonly createdAt: number,
    public readonly updatedAt: number
  ) {}
}

export default PromptTemplateEntity;
