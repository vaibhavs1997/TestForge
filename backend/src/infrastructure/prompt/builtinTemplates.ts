// Built-in prompt templates for the Prompt Framework.
// These are deterministic, system-provided templates that require no LLM calls
// to be constructed. They are seeded into the PromptRepository on first access.

import { PromptTemplateEntity, PromptTemplateCategory } from '../../domain/prompt';
import { PromptRepository } from './PromptRepository';

export interface BuiltinTemplateDef {
  id: string;
  name: string;
  description: string;
  category: PromptTemplateCategory;
  systemPrompt: string;
  userPrompt: string;
  variables: { name: string; description: string; required: boolean; sourcePath: string }[];
  enabled: boolean;
}

export const BUILTIN_TEMPLATES: BuiltinTemplateDef[] = [
  {
    id: 'tmpl-req-gen-001',
    name: 'Requirement Generation Template',
    description: 'Generates testable requirements from API definitions and knowledge flows.',
    category: 'Requirement Generation',
    systemPrompt:
      'You are a requirements analyst. Generate clear, testable acceptance criteria from the following project context.',
    userPrompt:
      'Generate requirements based on:\n\nAPI Services: {{apis}}\nAPI Operations: {{apiOperations}}\nKnowledge Flows: {{knowledgeFlows}}\nBusiness Rules: {{businessRules}}\n\nUse the runtime variables {{runtimeVariables}} and dependencies {{dependencies}} as needed.',
    variables: [
      { name: 'apis', description: 'Project API services', required: true, sourcePath: 'apis' },
      { name: 'apiOperations', description: 'API operations', required: true, sourcePath: 'apiOperations' },
      { name: 'knowledgeFlows', description: 'Documented knowledge flows', required: false, sourcePath: 'knowledgeFlows' },
      { name: 'businessRules', description: 'Business rules', required: false, sourcePath: 'businessRules' },
      { name: 'runtimeVariables', description: 'Runtime variables', required: false, sourcePath: 'runtimeVariables' },
      { name: 'dependencies', description: 'External dependencies', required: false, sourcePath: 'dependencies' },
    ],
    enabled: true,
  },
  {
    id: 'tmpl-strategy-001',
    name: 'Test Strategy Template',
    description: 'Generates test strategies covering positive, negative, security, and boundary scenarios.',
    category: 'Test Strategy',
    systemPrompt:
      'You are a test strategy expert. Create a comprehensive test strategy covering positive, negative, security, and boundary test scenarios.',
    userPrompt:
      'Create test strategies based on:\n\nRequirements: {{requirements}}\nAPI Operations: {{apiOperations}}\nDatasets: {{datasets}}\nEnvironment: {{environments}}\n\nConsider business rules {{businessRules}} and knowledge flows {{knowledgeFlows}}.',
    variables: [
      { name: 'requirements', description: 'Project requirements', required: true, sourcePath: 'requirements' },
      { name: 'apiOperations', description: 'API operations', required: true, sourcePath: 'apiOperations' },
      { name: 'datasets', description: 'Test datasets', required: false, sourcePath: 'datasets' },
      { name: 'environments', description: 'Environments', required: false, sourcePath: 'environments' },
      { name: 'businessRules', description: 'Business rules', required: false, sourcePath: 'businessRules' },
      { name: 'knowledgeFlows', description: 'Knowledge flows', required: false, sourcePath: 'knowledgeFlows' },
    ],
    enabled: true,
  },
  {
    id: 'tmpl-design-001',
    name: 'Test Design Template',
    description: 'Generates detailed test designs with request templates and expected results.',
    category: 'Test Design',
    systemPrompt:
      'You are a test design specialist. Generate detailed test designs with request templates for each API operation.',
    userPrompt:
      'Create test designs for:\n\nAPI Operations: {{apiOperations}}\nDatasets: {{datasets}}\nDataset Columns: {{datasetColumns}}\nDatasets Relationships: {{datasetRelationships}}\n\nMap each design to requirements {{requirements}} and use runtime variables {{runtimeVariables}}.',
    variables: [
      { name: 'apiOperations', description: 'API operations', required: true, sourcePath: 'apiOperations' },
      { name: 'datasets', description: 'Test datasets', required: true, sourcePath: 'datasets' },
      { name: 'datasetColumns', description: 'Dataset columns', required: false, sourcePath: 'datasetColumns' },
      { name: 'datasetRelationships', description: 'Dataset relationships', required: false, sourcePath: 'datasetRelationships' },
      { name: 'requirements', description: 'Requirements', required: false, sourcePath: 'requirements' },
      { name: 'runtimeVariables', description: 'Runtime variables', required: false, sourcePath: 'runtimeVariables' },
    ],
    enabled: true,
  },
  {
    id: 'tmpl-assert-001',
    name: 'Assertion Generation Template',
    description: 'Generates assertions for HTTP status, headers, body, and JSONPath validations.',
    category: 'Assertion Generation',
    systemPrompt:
      'You are an assertion expert. Generate assertions covering HTTP status, headers, body, and JSONPath validations.',
    userPrompt:
      'Generate assertions based on:\n\nRequirements: {{requirements}}\nAPI Operations: {{apiOperations}}\nTest Strategies: {{testStrategies}}\n\nReference existing assertions {{assertions}} where applicable.',
    variables: [
      { name: 'requirements', description: 'Requirements', required: true, sourcePath: 'requirements' },
      { name: 'apiOperations', description: 'API operations', required: true, sourcePath: 'apiOperations' },
      { name: 'testStrategies', description: 'Test strategies', required: false, sourcePath: 'testStrategies' },
      { name: 'assertions', description: 'Existing assertions', required: false, sourcePath: 'assertions' },
    ],
    enabled: true,
  },
  {
    id: 'tmpl-data-gen-001',
    name: 'Test Data Generation Template',
    description: 'Generates test data for datasets based on column definitions and patterns.',
    category: 'Test Data Generation',
    systemPrompt:
      'You are a test data generation specialist. Produce synthetic test data for the given datasets and columns.',
    userPrompt:
      'Generate test data for:\n\nDatasets: {{datasets}}\nDataset Columns: {{datasetColumns}}\nDataset Relationships: {{datasetRelationships}}\nDatasets Columns: {{datasetColumns}}\n\nEnsure data types and constraints are respected.',
    variables: [
      { name: 'datasets', description: 'Datasets', required: true, sourcePath: 'datasets' },
      { name: 'datasetColumns', description: 'Dataset columns', required: true, sourcePath: 'datasetColumns' },
      { name: 'datasetRelationships', description: 'Dataset relationships', required: false, sourcePath: 'datasetRelationships' },
    ],
    enabled: true,
  },
  {
    id: 'tmpl-failure-001',
    name: 'Failure Analysis Template',
    description: 'Analyzes execution runs and audit logs to diagnose test failures.',
    category: 'Failure Analysis',
    systemPrompt:
      'You are a failure analysis expert. Analyze execution failures and provide root-cause insights.',
    userPrompt:
      'Analyze failures based on:\n\nExecution Runs: {{executionRuns}}\nAssertions: {{assertions}}\nAudit Summary: {{auditSummary}}\nTest Designs: {{testDesigns}}\n\nRecommendations: {{recommendations}}',
    variables: [
      { name: 'executionRuns', description: 'Execution runs', required: false, sourcePath: 'executionRuns' },
      { name: 'assertions', description: 'Assertions', required: false, sourcePath: 'assertions' },
      { name: 'auditSummary', description: 'Audit log entries', required: false, sourcePath: 'auditSummary' },
      { name: 'testDesigns', description: 'Test designs', required: false, sourcePath: 'testDesigns' },
      { name: 'recommendations', description: 'Recommendations', required: false, sourcePath: 'recommendations' },
    ],
    enabled: true,
  },
  {
    id: 'tmpl-report-001',
    name: 'Report Summary Template',
    description: 'Summarizes readiness reports, execution plans, and audit data into a concise report.',
    category: 'Report Summary',
    systemPrompt:
      'You are a reporting specialist. Produce a concise summary of project readiness and execution status.',
    userPrompt:
      'Summarize the project state based on:\n\nReadiness Reports: {{readinessReports}}\nExecution Plans: {{executionPlans}}\nTest Suites: {{suites}}\nAudit Summary: {{auditSummary}}\nRecommendations: {{recommendations}}\n\nStatistics: {{statistics}}',
    variables: [
      { name: 'readinessReports', description: 'Readiness reports', required: false, sourcePath: 'readinessReports' },
      { name: 'executionPlans', description: 'Execution plans', required: false, sourcePath: 'executionPlans' },
      { name: 'suites', description: 'Test suites', required: false, sourcePath: 'suites' },
      { name: 'auditSummary', description: 'Audit summary', required: false, sourcePath: 'auditSummary' },
      { name: 'recommendations', description: 'Recommendations', required: false, sourcePath: 'recommendations' },
      { name: 'statistics', description: 'Context statistics', required: false, sourcePath: 'statistics' },
    ],
    enabled: true,
  },
  {
    id: 'tmpl-custom-001',
    name: 'Custom Prompt Template',
    description: '',
    category: 'Custom',
    systemPrompt: 'You are a helpful assistant.',
    userPrompt: 'Context: {{context}}',
    variables: [
      { name: 'context', description: 'Full project context', required: true, sourcePath: 'statistics' },
    ],
    enabled: true,
  },
];

export function seedBuiltinTemplates(repo: PromptRepository): void {
  const now = Date.now();
  for (const tmpl of BUILTIN_TEMPLATES) {
    const entity = new PromptTemplateEntity(
      tmpl.id,
      null, // global, project-agnostic
      tmpl.name,
      tmpl.description,
      tmpl.category,
      tmpl.systemPrompt,
      tmpl.userPrompt,
      tmpl.variables,
      tmpl.enabled,
      1, // version
      now,
      now
    );
    // Directly store to avoid calling ensureSeeded again (would recurse)
    (repo as any).templates.set(entity.id, entity);
  }
}
