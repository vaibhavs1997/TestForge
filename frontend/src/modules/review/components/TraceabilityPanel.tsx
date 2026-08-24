import React from 'react';

type AnyRecord = Record<string, any>;

const coverageTone = (state?: string) => (
  state === 'COVERED' ? 'text-green-700'
    : state === 'PARTIALLY_COVERED' ? 'text-amber-700'
      : state === 'UNKNOWN' || state === 'NOT_APPLICABLE' ? 'text-text-secondary'
        : 'text-red-700'
);

const formatTime = (value?: number) => value ? new Date(value).toLocaleString() : 'Not recorded';
const duration = (attempt: AnyRecord) => attempt.startedAt && attempt.completedAt ? `${attempt.completedAt - attempt.startedAt} ms` : 'Not recorded';
const safeAttemptError = (error?: string) => error && /^(HTTP \d{3}|Assertion failed|Validation failed|Request failed|Execution cancelled|Execution canceled)$/i.test(error) ? error : error ? 'Sanitized failure recorded' : '';

/** Displays backend-sanitized traceability metadata only. Resolved input values are intentionally never rendered. */
export const TraceabilityPanel: React.FC<{ trace: any; coverage?: any }> = ({ trace, coverage }) => {
  const provenance = trace?.generationProvenance;
  const snapshot = trace?.executionSnapshot || trace?.execution?.snapshot || trace?.stepResult?.executionSnapshot;
  const attempts = trace?.attempts || trace?.execution?.attempts || trace?.stepResult?.attempts || [];
  const coverageEntries = Object.entries(coverage || {}).filter(([, value]: [string, any]) => value?.state);
  const omissions = [
    ...Object.values(coverage || {}).flatMap((value: any) => value?.omittedScenarioFamilies || []),
    ...(provenance?.budget?.omittedScenarioFamilies || []),
  ].filter((item: any, index: number, all: any[]) => item && all.findIndex((candidate) => `${candidate.family || candidate.scenarioId}:${candidate.reason}` === `${item.family || item.scenarioId}:${item.reason}`) === index);
  const mappingNeedsReview = ['review', 'unmapped', 'unconfirmed', 'UNCONFIRMED'].includes(provenance?.mapping?.state);

  if (!provenance && !coverage && !snapshot) return <p className="text-sm text-text-secondary">Traceability is unavailable for this legacy version.</p>;

  return (
    <section aria-label="Trust and traceability" className="mt-4 space-y-4 rounded border border-border bg-background/40 p-3 text-sm">
      <div>
        <h3 className="font-semibold">Why this test was generated</h3>
        <p><b>Mode:</b> <span className={provenance?.mode === 'FALLBACK' ? 'font-semibold text-amber-700' : ''}>{provenance?.mode || 'LEGACY'}</span></p>
        {provenance?.mode !== 'FALLBACK' && provenance?.ai && <p><b>AI:</b> {provenance.ai.provider} / {provenance.ai.model} · attempts {provenance.ai.attempts ?? 1} · {provenance.ai.validationStatus ?? 'VALID'}</p>}
        {provenance?.fallback && <p className="text-amber-700"><b>Fallback:</b> {provenance.fallback.reason || provenance.fallback.failureCategory || 'Deterministic replacement used'}</p>}
        {provenance?.budget && <p><b>Selection:</b> {provenance.budget.selectionReason || 'Not recorded'} · risk {provenance.budget.riskScore ?? 'Not recorded'}</p>}
      </div>

      <div>
        <h3 className="font-semibold">How it maps to the API</h3>
        <p className={mappingNeedsReview ? 'font-semibold text-amber-700' : ''}>
          {provenance?.operation?.serviceId || 'Service unavailable'} / {provenance?.operation?.id || trace?.operationId || 'Operation unavailable'} · confidence {provenance?.mapping?.confidence ?? 'Unknown'} · {provenance?.mapping?.state ?? 'Unknown'}
        </p>
        <p className="text-text-secondary">Requirement: {provenance?.requirement?.id || trace?.requirementId || 'Unavailable'} · acceptance criteria: {(provenance?.acceptanceCriteria || provenance?.acceptanceCriterionIds || [trace?.acceptanceCriterionId]).filter(Boolean).join(', ') || 'None'}</p>
      </div>

      <div>
        <h3 className="font-semibold">What data was used</h3>
        <p>Knowledge: {provenance?.knowledgeSourceIds?.join(', ') || 'None'} · Field rules: {provenance?.testData?.fieldRuleIds?.join(', ') || 'None'}</p>
        <p>Mutation: {provenance?.mutation ? `${provenance.mutation.strategy || 'Unknown'} at ${provenance.mutation.location || 'Unknown'}:${provenance.mutation.fieldPath || 'Unknown'}` : 'None'}</p>
      </div>

      <div>
        <h3 className="font-semibold">What it covers</h3>
        {coverageEntries.length ? coverageEntries.map(([name, item]: [string, any]) => <p key={name} className={coverageTone(item.state)}>{name}: {item.state} ({item.covered}/{item.totalKnown ?? '?'})</p>) : <p className="text-text-secondary">Coverage is unavailable for this version.</p>}
      </div>

      <div>
        <h3 className="font-semibold">What is not covered</h3>
        {omissions.length ? <ul className="list-inside list-disc">{omissions.map((item: any, index: number) => <li key={`${item.family || item.scenarioId}-${index}`}>{item.family || item.scenarioId || 'Scenario'}: {item.reason || 'Not recorded'}</li>)}</ul> : <p className="text-text-secondary">No omitted scenario families recorded.</p>}
      </div>

      <div>
        <h3 className="font-semibold">How it executed</h3>
        {!snapshot ? <p className="text-text-secondary">No execution lineage recorded.</p> : <>
          <p><b>Base snapshot:</b> {snapshot.baseSnapshotId || 'Unavailable'} · captured {formatTime(snapshot.capturedAt)}</p>
          <p>Dataset: {snapshot.dataset?.id || 'None'}{snapshot.dataset?.rowReference ? ` · row ${snapshot.dataset.rowReference}` : ''} · Environment: {snapshot.environment?.id || 'Unavailable'}{snapshot.environment?.version !== undefined ? ` v${snapshot.environment.version}` : ''}</p>
          <p>Field rules: {(snapshot.fieldRuleIds || []).map((rule: AnyRecord) => `${rule.id}${rule.version !== undefined ? ` v${rule.version}` : ''}`).join(', ') || 'None'} · Mutation: {snapshot.mutation ? `${snapshot.mutation.strategy || 'Unknown'} at ${snapshot.mutation.location || 'Unknown'}:${snapshot.mutation.fieldPath || 'Unknown'}` : 'None'}</p>
          <ul aria-label="Execution lineage sources" className="list-inside list-disc">
            {(snapshot.resolvedFields || []).map((field: AnyRecord, index: number) => <li key={`${field.field}-${index}`}><b>{field.source || 'STATIC'}</b>: {field.field || 'Field'}{field.reference ? ` · reference ${field.reference}` : ''}{field.reproducibility ? ` · reproducibility ${field.reproducibility.status || 'PARTIAL'}` : ''}</li>)}
          </ul>
          <p className="text-text-secondary">Values and response bodies are intentionally not shown.</p>
        </>}
      </div>

      <div>
        <h3 className="font-semibold">Attempts and retries</h3>
        {!attempts.length ? <p className="text-text-secondary">No attempt metadata recorded.</p> : <ul aria-label="Execution attempts" className="space-y-1">{attempts.map((attempt: AnyRecord, index: number) => <li key={`${attempt.attempt || index}-${attempt.startedAt || index}`}>Attempt {attempt.attempt ?? index + 1}: {attempt.outcome || 'Unknown'}{attempt.statusCode ? ` · HTTP ${attempt.statusCode}` : ''} · {duration(attempt)} · {formatTime(attempt.startedAt)}{attempt.error ? ` · ${safeAttemptError(attempt.error)}` : ''}</li>)}</ul>}
      </div>
    </section>
  );
};
