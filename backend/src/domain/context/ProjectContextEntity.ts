// ProjectContextEntity - Aggregated, normalized project context object.
// This is the single deterministic input for every future AI feature.
// It does NOT implement LLM, prompt generation, or test generation.

import type { ApiServiceEntity } from '../api/ApiServiceEntity';
import type { ApiOperationEntity } from '../api/ApiOperationEntity';
import type { EnvironmentEntity } from '../environment/EnvironmentEntity';
import type { DatasetEntity } from '../test-data/DatasetEntity';
import type { ColumnEntity } from '../test-data/ColumnEntity';
import type { RelationshipEntity } from '../test-data/RelationshipEntity';
import type { KnowledgeFlowEntity } from '../knowledge/KnowledgeFlowEntity';
import type { BusinessRule } from '../knowledge/BusinessRuleEntity';
import type { RuntimeVariable } from '../knowledge/RuntimeVariableEntity';
import type { Dependency } from '../knowledge/DependencyEntity';
import type { Documentation } from '../knowledge/DocumentationEntity';
import type { AnalysisEntity } from '../analysis/AnalysisEntity';
import type { RequirementEntity } from '../requirements/RequirementEntity';
import type { ReportEntity } from '../report/ReportEntity';
import type { TestStrategyEntity } from '../requirements/TestStrategyEntity';
import type { TestDesignEntity } from '../requirements/TestDesignEntity';
import type { ExecutionPlanEntity } from '../requirements/ExecutionPlanEntity';
import type { AssertionEntity } from '../assertion/AssertionEntity';
import type { TestSuiteEntity } from '../suite/TestSuiteEntity';
import type { ExecutionProfileEntity } from '../execution/ExecutionProfileEntity';
import type { ProviderEntity } from '../providers/ProviderEntity';
import type { Recommendation } from '../recommendation/RecommendationEntity';
import type { VersionEntity } from '../versioning/VersionEntity';
import type { AuditLogEntity } from '../audit/AuditLogEntity';
import type { PluginEntity } from '../plugin/PluginEntity';

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