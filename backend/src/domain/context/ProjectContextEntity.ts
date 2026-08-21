// ProjectContextEntity - Aggregated, normalized project context object.
// This is the single deterministic input for every future AI feature.
// It does NOT implement LLM, prompt generation, or test generation.

import type { ApiServiceEntity } from '../api/ApiServiceEntity.js';
import type { ApiOperationEntity } from '../api/ApiOperationEntity.js';
import type { EnvironmentEntity } from '../environment/EnvironmentEntity.js';
import type { DatasetEntity } from '../test-data/DatasetEntity.js';
import type { ColumnEntity } from '../test-data/ColumnEntity.js';
import type { RelationshipEntity } from '../test-data/RelationshipEntity.js';
import type { KnowledgeFlowEntity } from '../knowledge/KnowledgeFlowEntity.js';
import type { BusinessRule } from '../knowledge/BusinessRuleEntity.js';
import type { RuntimeVariable } from '../knowledge/RuntimeVariableEntity.js';
import type { Dependency } from '../knowledge/DependencyEntity.js';
import type { Documentation } from '../knowledge/DocumentationEntity.js';
import type { AnalysisEntity } from '../analysis/AnalysisEntity.js';
import type { RequirementEntity } from '../requirements/RequirementEntity.js';
import type { ReportEntity } from '../report/ReportEntity.js';
import type { TestStrategyEntity } from '../requirements/TestStrategyEntity.js';
import type { TestDesignEntity } from '../requirements/TestDesignEntity.js';
import type { ExecutionPlanEntity } from '../requirements/ExecutionPlanEntity.js';
import type { AssertionEntity } from '../assertion/AssertionEntity.js';
import type { TestSuiteEntity } from '../suite/TestSuiteEntity.js';
import type { ExecutionProfileEntity } from '../execution/ExecutionProfileEntity.js';
import type { ProviderEntity } from '../providers/ProviderEntity.js';
import type { Recommendation } from '../recommendation/RecommendationEntity.js';
import type { VersionEntity } from '../versioning/VersionEntity.js';
import type { AuditLogEntity } from '../audit/AuditLogEntity.js';
import type { PluginEntity } from '../plugin/PluginEntity.js';

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ProjectContextStatistics {
  apis: number;
  apiOperations: number;
  environments: number;
  datasets: number;
  datasetColumns: number;
  datasetRelationships: number;
  knowledgeFlows: number;
  businessRules: number;
  runtimeVariables: number;
  dependencies: number;
  documentation: number;
  analysis: number;
  requirements: number;
  readinessReports: number;
  testStrategies: number;
  testDesigns: number;
  executionPlans: number;
  assertions: number;
  suites: number;
  executionProfiles: number;
  providers: number;
  recommendations: number;
  versions: number;
  auditEntries: number;
  plugins: number;
  totalEntities: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  severity: 'High' | 'Medium' | 'Low';
  section: string;
}

export interface ProjectContextEntity {
  projectId: string;
  generatedAt: number;
  project: ProjectSummary | null;
  apis: ApiServiceEntity[];
  apiOperations: ApiOperationEntity[];
  environments: EnvironmentEntity[];
  datasets: DatasetEntity[];
  datasetColumns: ColumnEntity[];
  datasetRelationships: RelationshipEntity[];
  knowledgeFlows: KnowledgeFlowEntity[];
  businessRules: BusinessRule[];
  runtimeVariables: RuntimeVariable[];
  dependencies: Dependency[];
  documentation: Documentation[];
  analysis: AnalysisEntity[];
  requirements: RequirementEntity[];
  readinessReports: ReportEntity[];
  testStrategies: TestStrategyEntity[];
  testDesigns: TestDesignEntity[];
  executionPlans: ExecutionPlanEntity[];
  assertions: AssertionEntity[];
  suites: TestSuiteEntity[];
  executionProfiles: ExecutionProfileEntity[];
  providers: ProviderEntity[];
  recommendations: Recommendation[];
  versions: VersionEntity[];
  auditSummary: AuditLogEntity[];
  plugins: PluginEntity[];
  statistics: ProjectContextStatistics;
  validationWarnings: ValidationWarning[];
}

export default ProjectContextEntity;