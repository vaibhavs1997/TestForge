import { describe, expect, it } from 'vitest';
import { configurationSummary, needsAttention, strategyLabel } from './ExecutionDataWorkspace';

describe('test data strategy editing semantics', () => {
  it('classifies strategies and only flags incomplete configuration', () => {
    expect(strategyLabel({ valueStrategy: 'GENERATE' })).toBe('Dynamic');
    expect(configurationSummary({ valueStrategy: 'DATASET', sourceReference: { datasetId: 'd1', field: 'email' } })).toContain('d1');
    expect(needsAttention({ status: 'ACCEPTED', valueStrategy: 'DATASET', sourceReference: { datasetId: 'd1', field: 'email' } })).toBe(false);
    expect(needsAttention({ status: 'ACCEPTED', valueStrategy: 'DATASET', sourceReference: {} })).toBe(true);
  });

  it('never uses a masked static value as a rendered configuration', () => {
    expect(configurationSummary({ valueStrategy: 'FIXED', sourceReference: { masked: true, value: 'should-not-render' } })).toBe('Sensitive value (masked)');
  });
});
import { locationLabel, operationLabel, sourceLabel, statusLabel } from './ExecutionDataWorkspace';

describe('ExecutionDataWorkspace presentation semantics', () => {
  it('uses human-readable operation identity and request location', () => {
    expect(operationLabel({ input: { operationLabel: 'POST /users', operationId: 'opaque-id' } })).toBe('POST /users');
    expect(operationLabel({ input: { operationId: 'opaque-id' } })).toBe('opaque-id');
    expect(locationLabel('QUERY')).toBe('query');
  });

  it('keeps dashboard status labels aligned with rule status', () => {
    expect(statusLabel({ status: 'ACCEPTED', valueStrategy: 'GENERATE' })).toBe('READY');
    expect(statusLabel({ status: 'ACCEPTED', valueStrategy: 'LINKED_RESPONSE' })).toBe('LINKED');
    expect(statusLabel({ status: 'REVIEW_REQUIRED', valueStrategy: 'SECRET' })).toBe('NEEDS_REVIEW');
    expect(statusLabel({ status: 'UNRESOLVED', valueStrategy: 'MANUAL' })).toBe('UNRESOLVED');
  });

  it('describes actionable sources in user language', () => {
    expect(sourceLabel({ valueStrategy: 'GENERATE', semanticType: 'email' })).toBe('Generate email');
    expect(sourceLabel({ valueStrategy: 'LINKED_RESPONSE', optionalFieldPolicy: 'POPULATE' })).toBe('Use previous API response');
    expect(sourceLabel({ valueStrategy: 'MANUAL', optionalFieldPolicy: 'OMIT' })).toBe('Omit optional field');
  });
});
