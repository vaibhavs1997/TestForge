// Prompt Builder module types

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
  sourcePath: string;
}

export interface PromptTemplate {
  id: string;
  projectId: string | null;
  name: string;
  description: string;
  category: PromptTemplateCategory;
  systemPrompt: string;
  userPrompt: string;
  variables: PromptTemplateVariable[];
  enabled: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type PromptStatus = 'Draft' | 'Built' | 'Validated' | 'Invalid';

export interface PromptVariableValue {
  name: string;
  value: any;
  resolved: boolean;
  source: string;
}

export interface Prompt {
  id: string;
  projectId: string;
  templateId: string;
  name: string;
  category: PromptTemplateCategory;
  systemPrompt: string;
  userPrompt: string;
  variables: PromptVariableValue[];
  status: PromptStatus;
  tokenEstimate: number;
  validationWarnings: string[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  variables: PromptVariableValue[];
  tokenEstimate: number;
  validationWarnings: string[];
  status: PromptStatus;
}

export interface BuildPromptRequest {
  templateId: string;
  customVariables?: Record<string, any>;
  createdBy?: string;
}

export interface PreviewPromptRequest {
  templateId: string;
  projectId: string | null;
  systemPromptOverride?: string;
  userPromptOverride?: string;
  variableOverrides?: Record<string, any>;
}
