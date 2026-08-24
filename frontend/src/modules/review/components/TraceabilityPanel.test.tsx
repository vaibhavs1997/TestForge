import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TraceabilityPanel } from './TraceabilityPanel';

const coverage = {
  acceptanceCriteria: { state: 'COVERED', covered: 1, totalKnown: 1 },
  fields: { state: 'PARTIALLY_COVERED', covered: 1, totalKnown: 2 },
  endpoints: { state: 'UNCOVERED', covered: 0, totalKnown: 1 },
  auth: { state: 'UNKNOWN', covered: 0, totalKnown: undefined },
  cookies: { state: 'NOT_APPLICABLE', covered: 0, totalKnown: 0 },
  scenarioFamilies: { omittedScenarioFamilies: [{ family: 'edge', reason: 'BUDGET_LIMIT_REACHED' }] },
};

describe('TraceabilityPanel', () => {
  it('shows deterministic and genuine AI provenance, coverage states, mapping review and budget rationale', () => {
    const { rerender } = render(<TraceabilityPanel trace={{ generationProvenance: { mode: 'DETERMINISTIC', requirement: { id: 'REQ-1' }, acceptanceCriteria: ['AC-1'], mapping: { confidence: 30, state: 'unconfirmed' }, budget: { selectionReason: 'Required field', riskScore: 91 } } }} coverage={coverage} />);
    expect(screen.getByText(/DETERMINISTIC/)).toBeTruthy();
    expect(screen.getByText(/unconfirmed/)).toBeTruthy();
    expect(screen.getByText(/Required field/)).toBeTruthy();
    ['COVERED', 'PARTIALLY_COVERED', 'UNCOVERED', 'UNKNOWN', 'NOT_APPLICABLE'].forEach((text) => expect(screen.getByText(new RegExp(`: ${text} \\(`))).toBeTruthy());
    expect(screen.getByText(/BUDGET_LIMIT_REACHED/)).toBeTruthy();
    rerender(<TraceabilityPanel trace={{ generationProvenance: { mode: 'AI_GENERATED', ai: { provider: 'OpenAI', model: 'gpt-test', attempts: 2, validationStatus: 'VALID' } } }} />);
    expect(screen.getByText(/OpenAI \/ gpt-test/)).toBeTruthy();
  });

  it('shows fallback without provider attribution', () => {
    render(<TraceabilityPanel trace={{ generationProvenance: { mode: 'FALLBACK', ai: { provider: 'Misleading', model: 'model' }, fallback: { reason: 'PROVIDER_UNAVAILABLE' } } }} />);
    expect(screen.getByText(/FALLBACK/)).toBeTruthy();
    expect(screen.getByText(/PROVIDER_UNAVAILABLE/)).toBeTruthy();
    expect(screen.queryByText(/Misleading/)).toBeNull();
  });

  it('shows sanitized execution lineage and retries without resolved values', () => {
    render(<TraceabilityPanel trace={{ executionSnapshot: { baseSnapshotId: 'snapshot-1', capturedAt: 1000, environment: { id: 'env', version: 2 }, dataset: { id: 'dataset', rowReference: 'row-4' }, fieldRuleIds: [{ id: 'rule', version: 3 }], mutation: { strategy: 'boundary', location: 'query', fieldPath: 'age' }, resolvedFields: [
      { field: 'customer', source: 'DATASET', reference: 'row-4', value: 'dataset-value' }, { field: 'id', source: 'GENERATOR', reproducibility: { status: 'PARTIAL' } }, { field: 'host', source: 'ENVIRONMENT', reference: 'BASE_URL', value: 'secret-env-value' }, { field: 'token', source: 'SECRET', reference: 'vault:token', value: 'raw-secret' }, { field: 'run', source: 'RUNTIME', reference: 'runId', value: 'runtime-secret' }, { field: 'prior', source: 'DEPENDENCY_RESPONSE', reference: 'step-1.id', value: 'dependency-body' }, { field: 'override', source: 'MANUAL_OVERRIDE' }, { field: 'fixed', source: 'STATIC' },
    ] }, attempts: [{ attempt: 1, outcome: 'Failed', statusCode: 503, startedAt: 1000, completedAt: 1050, error: 'HTTP 503' }, { attempt: 2, outcome: 'Passed', statusCode: 200, startedAt: 1100, completedAt: 1120, error: 'Authorization: Bearer raw-secret' }] }} />);
    ['DATASET', 'GENERATOR', 'ENVIRONMENT', 'SECRET', 'RUNTIME', 'DEPENDENCY_RESPONSE', 'MANUAL_OVERRIDE', 'STATIC', 'vault:token', 'snapshot-1', 'Attempt 2: Passed', 'HTTP 503'].forEach((text) => expect(screen.getByText(new RegExp(text))).toBeTruthy());
    expect(screen.queryByText(/raw-secret|secret-env-value|runtime-secret|dependency-body|Bearer |password=/i)).toBeNull();
    expect(screen.getByText(/Sanitized failure recorded/)).toBeTruthy();
  });

  it('handles an unavailable snapshot and legacy records', () => {
    const { rerender } = render(<TraceabilityPanel trace={{ generationProvenance: { mode: 'DETERMINISTIC' } }} />);
    expect(screen.getByText(/No execution lineage recorded/)).toBeTruthy();
    rerender(<TraceabilityPanel trace={{}} />);
    expect(screen.getByText(/legacy version/)).toBeTruthy();
  });
});
