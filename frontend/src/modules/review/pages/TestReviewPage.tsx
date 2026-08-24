import React from 'react';
import { useParams } from 'react-router-dom';
import { apiAxios } from '../../../services/apiAxios';
import { TraceabilityPanel } from '../components/TraceabilityPanel';

const filterFields = ['requirementId', 'acceptanceCriterionId', 'operationId', 'operationRisk', 'mappingStatus', 'mappingConfidence', 'mutationStrategy'];
const controlClassName = 'rounded border border-border bg-background/80 p-2 text-sm text-text placeholder:text-text-secondary outline-none transition-colors focus:border-primary';

export const TestReviewPage: React.FC = () => {
  const { projectId } = useParams();
  const [lifecycle, setLifecycle] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string | undefined>>({});
  const [data, setData] = React.useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [selected, setSelected] = React.useState<any>(null);
  const [trace, setTrace] = React.useState<any>(null);
  const [coverage, setCoverage] = React.useState<Record<string, unknown> | null>(null);
  const [feedback] = React.useState('');

  const load = React.useCallback(async () => {
    if (!projectId) return;
    const [res, cov] = await Promise.all([
      apiAxios.get(`/api/projects/${projectId}/test-review`, { params: { ...(lifecycle ? { lifecycle } : {}), ...filters } }),
      apiAxios.get(`/api/projects/${projectId}/test-review/coverage`),
    ]);
    setData(res.data.data);
    setCoverage(cov.data.data);
  }, [projectId, lifecycle, filters]);

  React.useEffect(() => { void load(); }, [load]);

  const review = async (versionId: string, action: string) => {
    await apiAxios.post(`/api/projects/${projectId}/test-case-versions/${versionId}/${action}`);
    await load();
  };
  const select = async (item: any) => { setSelected(item); setTrace(null); try { setTrace((await apiAxios.get(`/api/projects/${projectId}/test-case-versions/${item.version.id}/traceability`)).data.data); } catch { setTrace({}); } };

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Test Review</h1>
        <p className="text-sm text-text-secondary">Review canonical test cases and immutable versions.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select aria-label="Lifecycle filter" value={lifecycle} onChange={(event) => setLifecycle(event.target.value)} className={controlClassName}>
          <option value="">All lifecycle states</option>
          {['GENERATED', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'DEPRECATED'].map((value) => <option key={value}>{value}</option>)}
        </select>
        {filterFields.map((key) => (
          <input key={key} aria-label={key} placeholder={key} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value || undefined }))} className={controlClassName} />
        ))}
        <span className="self-center text-sm text-text">{data.total} tests</span>
      </div>

      {coverage && (
        <section className="grid grid-cols-2 gap-2 rounded border border-border bg-background/40 p-3 text-sm" aria-label="Coverage summary">
          {Object.entries(coverage).filter(([, value]) => typeof value === 'number').map(([key, value]) => (
            <button key={key} onClick={() => setFilters((current) => ({ ...current, mutationStrategy: key === 'requiredFieldCoverage' ? 'required-field' : undefined }))}>{key}: {String(value)}</button>
          ))}
        </section>
      )}

      <div className="grid gap-3">
        {data.items.map((item: any) => (
          <article key={item.testCase.id} className="rounded border border-border bg-background/40 p-4">
            <button className="text-left font-medium" onClick={() => void select(item)}>{item.testCase.id} · {item.view.scenarioIntent}</button>
            <p className="text-sm text-text-secondary">{item.view.operation.protocol}: {item.view.operation.label} · {item.view.operation.risk} · v{item.view.currentVersion} · {item.view.reviewStatus}</p>
            <div className="mt-2 flex gap-2">{['approve', 'reject', 'deprecate'].map((action) => <button key={action} onClick={() => review(item.version.id, action)} className="rounded border border-border px-2 py-1 text-sm">{action}</button>)}</div>
          </article>
        ))}
      </div>

      {feedback && <p>{feedback}</p>}
      {selected && (
        <aside className="rounded border border-border bg-surface p-4">
          <h2 className="font-semibold">Current version {selected.version.version}</h2>
          <p>{selected.view.requirementId} / {selected.view.acceptanceCriterionId || 'No AC'}</p>
          <p className="mt-3 text-sm text-text-secondary">Resolved request, response, assertion, and secret values are intentionally hidden from this review. Use the structured traceability information below to inspect safe references and decisions.</p>
          <TraceabilityPanel trace={trace} coverage={trace?.coverage || coverage} />
        </aside>
      )}
    </main>
  );
};

export default TestReviewPage;
