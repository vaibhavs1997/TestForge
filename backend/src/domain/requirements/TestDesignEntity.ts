// TestDesignEntity - Domain Entity for Test Design
// Converts approved Test Strategy items into executable designs.
// Does NOT execute tests or generate reports.

export type DesignPriority = 'High' | 'Medium' | 'Low';
export type DesignStatus = 'Draft' | 'Ready' | 'Disabled';
export type TestCaseType = 'Positive' | 'Negative' | 'Security';
export type MappingProvenance = 'ai' | 'matcher' | 'user';
export type MappingState = 'confirmed' | 'review' | 'unmapped';

export interface OperationDependency {
  sourceOperationId: string;
  sourceResponsePath?: string;
  targetOperationId: string;
  targetRequestPath?: string;
  transform?: string;
  evidence: string[];
}

export interface RequestOverride {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
}

export interface RuntimeBinding {
  variable: string;
  source: 'request' | 'response' | 'environment';
  path?: string;
}

export interface Assertion {
  type: 'status' | 'body' | 'header' | 'jsonPath';
  operator: 'equals' | 'contains' | 'matches' | 'exists';
  path: string;
  expected: any;
}

export interface AssertionReference {
  assertionId: string;
  enabled: boolean;
}

export interface CleanupStep {
  type: 'api' | 'dataset' | 'environment';
  action: string;
  target: string;
}

export interface MutationProvenance {
  strategy: 'baseline-valid' | 'required-field' | 'boundary' | 'type-violation' | 'enum-violation' | 'format-violation' | 'array-boundary' | 'schema-composition';
  location: 'body' | 'query' | 'path' | 'header' | 'cookie' | 'graphql-variable';
  fieldPath: string;
  schemaRule: string;
  originalValue: unknown;
  mutatedValue: unknown;
}

export type GenerationMode = 'DETERMINISTIC' | 'AI_GENERATED' | 'HYBRID' | 'FALLBACK';

/** Immutable, identifier-only snapshot of why a test design was generated. */
export interface GenerationProvenance {
  generatedAt: number;
  mode: GenerationMode;
  requirement: { id: string; version: number };
  acceptanceCriteria: Array<{ id: string; version: number }>;
  operation?: { id: string; serviceId: string; operationVersion: number; serviceVersion?: string };
  mapping: { confidence: number; state: MappingState; provenance: MappingProvenance };
  knowledgeSourceIds: string[];
  testData: { datasetId?: string; fieldRuleIds: string[]; sourceFields: string[] };
  mutation?: Pick<MutationProvenance, 'strategy' | 'location' | 'fieldPath' | 'schemaRule'>;
  ai?: { providerId: string; provider: string; model: string; promptTemplateId?: string; promptVersion?: string; attemptedAt?: number; attempts?: number; validationStatus?: 'VALID' | 'INVALID' | 'REPAIRED'; outcome?: 'SUCCESS' | 'FAILED'; failureCategory?: string };
  fallback?: { from: 'AI_GENERATED'; reason: string };
  budget?: { maxTotalScenarios: number; maxMutationsPerOperationField: number; allocation: { positive: number; negative: number; edge: number }; riskScore: number; selectionReason: string; omittedScenarioFamilies: Array<{ scenarioId: string; family: string; reason: string }> };
}

export class TestDesignEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly requirementId: string,
    public readonly strategyItemId: string,
    public readonly title: string,
    public readonly operationId: string,
    public readonly environmentId: string,
    public readonly datasetId: string,
    public readonly datasetRowReference: string,
    public readonly requestOverrides: RequestOverride,
    public readonly runtimeBindings: RuntimeBinding[],
    public readonly assertions: Assertion[],
    public readonly cleanup: CleanupStep[],
    public readonly priority: DesignPriority,
    public readonly status: DesignStatus,
    public readonly createdAt: number,
    public readonly updatedAt: number,
    public readonly assertionIds: AssertionReference[] = [],
    public readonly testCaseType?: TestCaseType,
    public readonly expectedHttpStatus?: number,
    public readonly mappingProvenance: MappingProvenance = 'matcher',
    public readonly mappingState: MappingState = 'review',
    public readonly mappingConfidence: number = 0,
    public readonly acceptanceCriterionId?: string,
    public readonly scenarioId?: string,
    public readonly dependencies: OperationDependency[] = [],
    public readonly mutationProvenance?: MutationProvenance,
    /** Set once at generation; later edits must not rewrite this snapshot. */
    public readonly generationProvenance?: GenerationProvenance,
  ) {}
}

export default TestDesignEntity;
