// Project Context module types

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

export interface ProjectContext {
  projectId: string;
  generatedAt: number;
  project: ProjectSummary | null;
  apis: any[];
  apiOperations: any[];
  environments: any[];
  datasets: any[];
  datasetColumns: any[];
  datasetRelationships: any[];
  knowledgeFlows: any[];
  businessRules: any[];
  runtimeVariables: any[];
  dependencies: any[];
  documentation: any[];
  analysis: any[];
  requirements: any[];
  readinessReports: any[];
  testStrategies: any[];
  testDesigns: any[];
  executionPlans: any[];
  assertions: any[];
  suites: any[];
  executionProfiles: any[];
  providers: any[];
  recommendations: any[];
  versions: any[];
  auditSummary: any[];
  plugins: any[];
  statistics: ProjectContextStatistics;
  validationWarnings: ValidationWarning[];
}

export interface ContextSection {
  key: string;
  label: string;
  data: any[];
  description: string;
}