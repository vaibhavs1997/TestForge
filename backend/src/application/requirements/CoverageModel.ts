import type { TestCaseVersionEntity } from '../../domain/test-case/TestCaseEntity.js';

export type CoverageState = 'COVERED' | 'PARTIALLY_COVERED' | 'UNCOVERED' | 'UNKNOWN' | 'NOT_APPLICABLE';
export type OmittedReason = 'generation budget reached' | 'unsupported schema construct' | 'duplicate scenario' | 'missing operation mapping' | 'insufficient Test Data' | 'dependency/precondition unavailable' | 'safety policy restriction' | 'AI/provider unavailable' | 'deterministic generation limit' | 'user exclusion';
export interface CoverageItem { id: string; state: CoverageState; evidenceVersionIds: string[]; }
export interface CoverageSummary { covered: number; totalKnown: number; percentage: number | null; state: CoverageState; uncoveredItems: CoverageItem[]; omittedScenarioFamilies: Array<{ family: string; reason: OmittedReason; detail?: string }>; unknownCoverageReasons: string[]; items: CoverageItem[]; }
export interface CoverageScope { acceptanceCriteriaIds?: string[]; operationIds?: string[]; requestFields?: Array<{ id: string; required?: boolean; location?: string }>; scenarioFamilies?: string[]; responseStatuses?: number[]; }

const state = (covered: number, total: number): CoverageState => total === 0 ? 'NOT_APPLICABLE' : covered === total ? 'COVERED' : covered ? 'PARTIALLY_COVERED' : 'UNCOVERED';
const evidence = (versions: TestCaseVersionEntity[], value: (v: TestCaseVersionEntity) => boolean) => versions.filter(value).map(v => v.id);
const family = (v: TestCaseVersionEntity) => String((v.content.generatedContent as any)?.testCaseType || '').toLowerCase();
const status = (v: TestCaseVersionEntity) => (v.content.assertions as any[] || []).find(a => a?.type === 'status')?.expected;

export function coverageDimension(versions: TestCaseVersionEntity[], expected: Array<{ id: string; matches: (v: TestCaseVersionEntity) => boolean }> | undefined, unknown: string): CoverageSummary {
  if (!expected) return { covered: 0, totalKnown: 0, percentage: null, state: 'UNKNOWN', uncoveredItems: [], omittedScenarioFamilies: [], unknownCoverageReasons: [unknown], items: [] };
  const items = expected.map(item => { const evidenceVersionIds = evidence(versions, item.matches); return { id: item.id, state: evidenceVersionIds.length ? 'COVERED' as CoverageState : 'UNCOVERED' as CoverageState, evidenceVersionIds }; });
  const covered = items.filter(item => item.state === 'COVERED').length;
  return { covered, totalKnown: items.length, percentage: items.length ? Math.round((covered / items.length) * 10000) / 100 : null, state: state(covered, items.length), uncoveredItems: items.filter(item => item.state === 'UNCOVERED'), omittedScenarioFamilies: [], unknownCoverageReasons: [], items };
}

export function calculateCoverage(versions: TestCaseVersionEntity[], scope: CoverageScope = {}) {
  const acceptanceCriteria = coverageDimension(versions, scope.acceptanceCriteriaIds?.map(id => ({ id, matches: v => v.content.acceptanceCriterionId === id })), 'Acceptance-criteria denominator is unavailable for this historical scope.');
  const operations = coverageDimension(versions, scope.operationIds?.map(id => ({ id, matches: v => v.content.operationId === id })), 'Operation denominator is unavailable for this historical scope.');
  const fields = coverageDimension(versions, scope.requestFields?.map(field => ({ id: field.id, matches: v => (v.content.generationProvenance?.testData.sourceFields || []).includes(field.id) || (v.content.mutationProvenance as any)?.fieldPath === field.id })), 'Request-field denominator is unavailable from persisted contract evidence.');
  const requiredFields = coverageDimension(versions, scope.requestFields?.filter(f => f.required).map(field => ({ id: field.id, matches: v => (v.content.generationProvenance?.testData.sourceFields || []).includes(field.id) || (v.content.mutationProvenance as any)?.fieldPath === field.id })), 'Required-field metadata is unavailable from persisted contract evidence.');
  const optionalFields = coverageDimension(versions, scope.requestFields?.filter(f => !f.required).map(field => ({ id: field.id, matches: v => (v.content.generationProvenance?.testData.sourceFields || []).includes(field.id) || (v.content.mutationProvenance as any)?.fieldPath === field.id })), 'Optional-field metadata is unavailable from persisted contract evidence.');
  const scenarioFamilies = coverageDimension(versions, (scope.scenarioFamilies || ['positive', 'negative', 'edge']).map(id => ({ id, matches: v => family(v) === id || (id === 'edge' && ['boundary', 'equivalence'].includes(String((v.content.mutationProvenance as any)?.strategy))) })), 'Scenario-family denominator is unavailable.');
  const responseStatuses = coverageDimension(versions, scope.responseStatuses?.map(id => ({ id: String(id), matches: v => status(v) === id })), 'Response-status denominator is unavailable from the contract.');
  const mutationLocations = coverageDimension(versions, ['body', 'query', 'path', 'header', 'cookie'].map(id => ({ id, matches: v => (v.content.mutationProvenance as any)?.location === id })), '');
  const boundary = coverageDimension(versions, [{ id: 'boundary-or-equivalence', matches: v => ['boundary', 'equivalence'].includes(String((v.content.mutationProvenance as any)?.strategy)) }], '');
  const authentication = coverageDimension(versions, [{ id: 'authentication', matches: v => /auth|unauthori[sz]ed|forbidden/i.test(v.content.scenarioIntent) || (v.content.mutationProvenance as any)?.location === 'header' }], '');
  const budgetOmissions = versions.flatMap(v => v.content.generationProvenance?.budget?.omittedScenarioFamilies || []);
  const omittedScenarioFamilies = scenarioFamilies.uncoveredItems.map(item => ({ family: item.id, reason: (budgetOmissions.find(x => x.family === item.id)?.reason === 'BUDGET_LIMIT_REACHED' ? 'generation budget reached' : 'deterministic generation limit') as OmittedReason, detail: 'No persisted generated version contains this scenario family.' }));
  scenarioFamilies.omittedScenarioFamilies = omittedScenarioFamilies;
  return { acceptanceCriteria, operations, requestFields: fields, requiredFields, optionalFields, scenarioFamilies, boundary, authentication, responseStatuses, mutationLocations };
}
