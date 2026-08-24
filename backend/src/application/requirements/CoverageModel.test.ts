import { describe, expect, it } from 'vitest';
import { TestCaseVersionEntity } from '../../domain/test-case/TestCaseEntity.js';
import { calculateCoverage } from './CoverageModel.js';

const version = (id: string, patch: any = {}) => new TestCaseVersionEntity(id, `case-${id}`, 1, {
  requirementId: 'req-1', acceptanceCriterionId: 'ac-1', operationId: 'op-1', scenarioIntent: 'positive request',
  payload: { password: 'never-expose' }, assertions: [{ type: 'status', expected: 200 }], mapping: { state: 'confirmed', confidence: 90 },
  generatedContent: { testCaseType: 'Positive' }, generationProvenance: { testData: { sourceFields: ['$.email'], fieldRuleIds: ['rule-1'] } }, ...patch,
} as any, 'GENERATED', 1);

describe('CoverageModel', () => {
  it('reports complete AC and endpoint coverage with explicit evidence', () => {
    const result = calculateCoverage([version('v1')], { acceptanceCriteriaIds: ['ac-1'], operationIds: ['op-1'] });
    expect(result.acceptanceCriteria).toMatchObject({ covered: 1, totalKnown: 1, percentage: 100, state: 'COVERED' });
    expect(result.acceptanceCriteria.items[0].evidenceVersionIds).toEqual(['v1']);
    expect(result.operations.percentage).toBe(100);
  });
  it('reports partial and uncovered ACs without duplicate inflation', () => {
    const result = calculateCoverage([version('v1'), version('v2')], { acceptanceCriteriaIds: ['ac-1', 'ac-2', 'ac-3'] });
    expect(result.acceptanceCriteria).toMatchObject({ covered: 1, totalKnown: 3, percentage: 33.33, state: 'PARTIALLY_COVERED' });
    expect(result.acceptanceCriteria.uncoveredItems.map(x => x.id)).toEqual(['ac-2', 'ac-3']);
  });
  it('covers request fields and separates required from optional fields', () => {
    const result = calculateCoverage([version('v1')], { requestFields: [{ id: '$.email', required: true }, { id: '$.note', required: false }] });
    expect(result.requestFields).toMatchObject({ covered: 1, totalKnown: 2, state: 'PARTIALLY_COVERED' });
    expect(result.requiredFields.percentage).toBe(100);
    expect(result.optionalFields.percentage).toBe(0);
  });
  it('reports positive, negative, edge, boundary, auth, response, and mutation-location evidence', () => {
    const variants = [version('p'), version('n', { generatedContent: { testCaseType: 'Negative' }, assertions: [{ type: 'status', expected: 400 }] }), version('e', { generatedContent: { testCaseType: 'Edge' }, scenarioIntent: 'authentication boundary', mutationProvenance: { strategy: 'boundary', location: 'header', fieldPath: '$.token' } })];
    const result = calculateCoverage(variants, { responseStatuses: [200, 400] });
    expect(result.scenarioFamilies.covered).toBe(3);
    expect(result.boundary.state).toBe('COVERED');
    expect(result.authentication.state).toBe('COVERED');
    expect(result.responseStatuses.percentage).toBe(100);
    expect(result.mutationLocations.items.find(x => x.id === 'header')?.state).toBe('COVERED');
  });
  it('reports omitted families and unknown denominators explicitly', () => {
    const result = calculateCoverage([version('v1')], { scenarioFamilies: ['positive', 'negative'] });
    expect(result.scenarioFamilies.omittedScenarioFamilies[0]).toMatchObject({ family: 'negative', reason: 'deterministic generation limit' });
    expect(result.operations).toMatchObject({ state: 'UNKNOWN', percentage: null });
  });
  it('links evidence to provenance without leaking Test Data values', () => {
    const result = calculateCoverage([version('v1')], { requestFields: [{ id: '$.email' }] });
    expect(result.requestFields.items[0].evidenceVersionIds).toEqual(['v1']);
    expect(JSON.stringify(result)).not.toContain('never-expose');
  });
  it('does not rewrite a historical result when the current scope changes', () => {
    const historical = calculateCoverage([version('old')], { acceptanceCriteriaIds: ['ac-1'] });
    const current = calculateCoverage([version('new', { acceptanceCriterionId: 'ac-2' })], { acceptanceCriteriaIds: ['ac-1', 'ac-2'] });
    expect(historical.acceptanceCriteria.percentage).toBe(100);
    expect(current.acceptanceCriteria.percentage).toBe(50);
  });
});
