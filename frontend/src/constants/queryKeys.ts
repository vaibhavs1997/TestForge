/**
 * Centralized React Query key constants.
 *
 * Conventions (see SPRINT4_4_QUERY_GUIDELINES.md):
 * - List queries:        [resource, projectId]
 * - Detail queries:      [resource, projectId, entityId]
 * - Nested list queries: [resource, projectId, subResource]
 * - Sub-resource detail: [resource, projectId, subResource, entityId]
 * - Global (non-project) queries: [resource] or [resource, 'scope']
 *
 * Example:
 *   ['projects']
 *   ['projects', projectId]
 *   ['requirements', projectId]
 *   ['requirements', projectId, requirementId]
 */

export const queryKeys = {
  // Projects
  projects: ['projects'] as const,
  project: (projectId: string) => ['projects', projectId] as const,
  projectDashboard: (projectId: string) => ['projects', projectId, 'dashboard'] as const,

  // API Services
  services: (projectId: string) => ['services', projectId] as const,
  service: (projectId: string, serviceId: string) => ['services', projectId, serviceId] as const,
  operations: (projectId: string) => ['operations', projectId] as const,
  operation: (projectId: string, serviceId: string, operationId: string) =>
    ['operations', projectId, serviceId, operationId] as const,

  // Environments
  environments: (projectId: string) => ['environments', projectId] as const,
  environment: (projectId: string, environmentId: string) =>
    ['environments', projectId, environmentId] as const,

  // Test Data
  datasets: (projectId: string) => ['datasets', projectId] as const,
  dataset: (projectId: string, datasetId: string) => ['datasets', projectId, datasetId] as const,
  rows: (projectId: string, datasetId: string) => ['rows', projectId, datasetId] as const,
  row: (projectId: string, datasetId: string, rowId: string) =>
    ['rows', projectId, datasetId, rowId] as const,
  columns: (projectId: string, datasetId: string) => ['columns', projectId, datasetId] as const,
  column: (projectId: string, datasetId: string, columnId: string) =>
    ['columns', projectId, datasetId, columnId] as const,
  columnSuggestions: (projectId: string, datasetName: string) =>
    ['columns', projectId, 'suggestions', datasetName] as const,
  mappings: (projectId: string, operationId?: string) =>
    ['mappings', projectId, operationId] as const,
  mapping: (projectId: string, mappingId: string) => ['mappings', projectId, mappingId] as const,
  profiles: (projectId: string, datasetId: string) => ['profiles', projectId, datasetId] as const,
  profile: (projectId: string, datasetId: string, profileId: string) =>
    ['profiles', projectId, datasetId, profileId] as const,

  // Knowledge
  knowledgeFlows: (projectId: string) => ['knowledge', projectId, 'flows'] as const,
  knowledgeFlow: (projectId: string, flowId: string) =>
    ['knowledge', projectId, 'flows', flowId] as const,
  businessRules: (projectId: string) => ['knowledge', projectId, 'rules'] as const,
  businessRule: (projectId: string, ruleId: string) =>
    ['knowledge', projectId, 'rules', ruleId] as const,
  runtimeVariables: (projectId: string) => ['knowledge', projectId, 'variables'] as const,
  runtimeVariable: (projectId: string, variableId: string) =>
    ['knowledge', projectId, 'variables', variableId] as const,
  dependencies: (projectId: string) => ['knowledge', projectId, 'dependencies'] as const,
  dependency: (projectId: string, dependencyId: string) =>
    ['knowledge', projectId, 'dependencies', dependencyId] as const,
  documentation: (projectId: string) => ['knowledge', projectId, 'documentation'] as const,
  document: (projectId: string, docId: string) =>
    ['knowledge', projectId, 'documentation', docId] as const,

  // Requirements
  requirements: (projectId: string) => ['requirements', projectId] as const,
  requirement: (projectId: string, requirementId: string) =>
    ['requirements', projectId, requirementId] as const,
  testDesigns: (projectId: string, requirementId: string) =>
    ['test-designs', projectId, requirementId] as const,
  executionPlansForRequirement: (projectId: string, requirementId: string) =>
    ['execution-plans', projectId, requirementId] as const,

  // Analysis
  analysis: (projectId: string) => ['analysis', projectId] as const,
  analysisCard: (projectId: string, analysisId: string) =>
    ['analysis', projectId, analysisId] as const,

  // Execution
  executions: (projectId: string) => ['executions', projectId] as const,
  execution: (projectId: string, runId: string) => ['executions', projectId, runId] as const,
  executionProfiles: (projectId: string) => ['execution-profiles', projectId] as const,
  executionProfile: (projectId: string, profileId: string) =>
    ['execution-profiles', projectId, profileId] as const,

  // Suites
  suites: (projectId: string) => ['suites', projectId] as const,
  suite: (projectId: string, suiteId: string) => ['suites', projectId, suiteId] as const,

  // Reports
  reports: (projectId: string) => ['reports', projectId] as const,
  report: (projectId: string, reportId: string) => ['reports', projectId, reportId] as const,

  // Schedules
  schedules: (projectId: string) => ['schedules', projectId] as const,
  schedule: (projectId: string, scheduleId: string) =>
    ['schedules', projectId, scheduleId] as const,

  // Assertions
  assertions: (projectId: string) => ['assertions', projectId] as const,
  assertion: (projectId: string, assertionId: string) =>
    ['assertions', projectId, assertionId] as const,

  // Recommendations
  recommendations: (projectId: string) => ['recommendations', projectId] as const,

  // Audit
  auditLogs: (projectId: string) => ['audit', projectId, 'logs'] as const,
  auditLog: (projectId: string, logId: string) => ['audit', projectId, 'logs', logId] as const,

  // Notifications
  notifications: (projectId: string) => ['notifications', projectId] as const,
  notification: (notificationId: string) => ['notifications', notificationId] as const,
  providers: (projectId: string) => ['notifications', projectId, 'providers'] as const,

  // Plugins
  plugins: (filters?: { category?: string; projectId?: string; enabled?: boolean }) =>
    ['plugins', filters] as const,
  plugin: (pluginId: string) => ['plugins', pluginId] as const,
  pluginHealth: (pluginId: string) => ['plugins', pluginId, 'health'] as const,

  // AI Providers
  aiProviders: (projectId: string) => ['ai-providers', projectId] as const,
  aiProvider: (projectId: string, providerId: string) =>
    ['ai-providers', projectId, providerId] as const,
  aiProviderTypes: () => ['ai-providers', 'types'] as const,
  aiProviderAdapters: () => ['ai-providers', 'adapters'] as const,
  aiProviderHealth: (projectId: string, providerId: string) =>
    ['ai-providers', projectId, providerId, 'health'] as const,

  // Versioning
  versions: (projectId: string, entityType?: string, entityId?: string) =>
    ['versions', projectId, entityType, entityId] as const,
  version: (versionId: string) => ['versions', versionId] as const,
  versionComparison: (projectId: string, versionId1: string, versionId2: string) =>
    ['versions', projectId, 'compare', versionId1, versionId2] as const,

  // Context
  projectContext: (projectId: string) => ['context', projectId] as const,

  // Prompts
  promptTemplates: (projectId: string) => ['prompts', projectId, 'templates'] as const,
  prompts: (projectId: string) => ['prompts', projectId] as const,
  prompt: (projectId: string, promptId: string) => ['prompts', projectId, promptId] as const,

  // Pipeline
  pipeline: (projectId: string) => ['pipeline', projectId] as const,
  pipelineStatus: (pipelineId: string) => ['pipeline', pipelineId, 'status'] as const,
} as const;

export default queryKeys;