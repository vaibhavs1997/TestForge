import React from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardCheck, FileSearch, Trash2 } from 'lucide-react';
import { apiAxios } from '../../../services/apiAxios';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { TraceabilityPanel } from '../components/TraceabilityPanel';

const filterFields = ['requirementId', 'acceptanceCriterionId', 'operationId', 'operationRisk', 'mappingStatus', 'mappingConfidence', 'mutationStrategy'];
const controlClassName = 'h-10 rounded-lg border border-border bg-background px-3 text-sm text-text placeholder:text-text-secondary/70 outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20';

const formatMetricLabel = (key: string): string => key
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/^./, (letter) => letter.toUpperCase());

const lifecycleBadgeVariant = (lifecycle?: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
  switch (lifecycle) {
    case 'APPROVED': return 'success';
    case 'REVIEW_REQUIRED': return 'warning';
    case 'REJECTED': return 'destructive';
    case 'DEPRECATED': return 'secondary';
    default: return 'outline';
  }
};

export const TestReviewPage: React.FC = () => {
  const { projectId } = useParams();
  const [lifecycle, setLifecycle] = React.useState('');
  const [filters, setFilters] = React.useState<Record<string, string | undefined>>({});
  const [data, setData] = React.useState<{ items: any[]; total: number }>({ items: [], total: 0 });
  const [selected, setSelected] = React.useState<any>(null);
  const [trace, setTrace] = React.useState<any>(null);
  const [coverage, setCoverage] = React.useState<Record<string, unknown> | null>(null);
  const [feedback] = React.useState('');
  const [deleteAllOpen, setDeleteAllOpen] = React.useState(false);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);

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

  const deleteAllTestCases = async () => {
    if (!projectId) return;
    setIsDeletingAll(true);
    try {
      await apiAxios.delete(`/api/projects/${projectId}/test-review/test-cases`);
      setSelected(null);
      setTrace(null);
      setDeleteAllOpen(false);
      await load();
    } finally {
      setIsDeletingAll(false);
    }
  };

  const select = async (item: any) => {
    setSelected(item);
    setTrace(null);
    try {
      setTrace((await apiAxios.get(`/api/projects/${projectId}/test-case-versions/${item.version.id}/traceability`)).data.data);
    } catch {
      setTrace({});
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden>
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Test Review</h1>
            <p className="mt-1 text-sm text-text-secondary">Review generated test cases and their immutable versions.</p>
          </div>
        </div>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setDeleteAllOpen(true)}
          disabled={data.total === 0}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Delete all test cases
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Find test cases</CardTitle>
          <CardDescription>Filter by lifecycle, requirement, API operation, mapping, or mutation strategy.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <select aria-label="Lifecycle filter" value={lifecycle} onChange={(event) => setLifecycle(event.target.value)} className={controlClassName}>
              <option value="">All lifecycle states</option>
              {['GENERATED', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'DEPRECATED'].map((value) => <option key={value}>{value}</option>)}
            </select>
            {filterFields.map((key) => (
              <input
                key={key}
                aria-label={key}
                placeholder={formatMetricLabel(key)}
                onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value || undefined }))}
                className={controlClassName}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {coverage && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Coverage summary">
          {Object.entries(coverage)
            .filter(([, value]) => typeof value === 'number')
            .map(([key, value]) => (
              <Card key={key} className="bg-surface/80">
                <CardContent className="p-4">
                  <button
                    type="button"
                    onClick={() => setFilters((current) => ({ ...current, mutationStrategy: key === 'requiredFieldCoverage' ? 'required-field' : undefined }))}
                    className="w-full text-left"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{formatMetricLabel(key)}</p>
                    <p className="mt-1 text-2xl font-semibold text-text">{String(value)}</p>
                  </button>
                </CardContent>
              </Card>
            ))}
        </section>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Test cases</CardTitle>
            <CardDescription>Open a case to inspect its safe traceability details.</CardDescription>
          </div>
          <Badge variant="secondary">{data.total} total</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.length === 0 ? (
            <EmptyState
              icon={<FileSearch className="h-12 w-12" />}
              title="No test cases found"
              description="Generate a test suite from Requirements, or change the filters to view existing test cases."
            />
          ) : data.items.map((item: any) => (
            <article key={item.testCase.id} className="rounded-lg border border-border bg-background/50 p-4 transition-colors hover:bg-surface">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button type="button" className="min-w-0 text-left" onClick={() => void select(item)}>
                  <p className="truncate font-semibold text-text">{item.view.scenarioIntent || 'Untitled test case'}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {item.view.operation.protocol}: {item.view.operation.label} · v{item.view.currentVersion}
                  </p>
                </button>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant={lifecycleBadgeVariant(item.view.reviewStatus)}>{item.view.reviewStatus}</Badge>
                  <Badge variant="outline">{item.view.operation.risk}</Badge>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void review(item.version.id, 'approve')}>Approve</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void review(item.version.id, 'reject')}>Reject</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void review(item.version.id, 'deprecate')}>Deprecate</Button>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      {feedback && <p>{feedback}</p>}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Traceability details</CardTitle>
            <CardDescription>Current version {selected.version.version} · {selected.view.requirementId} / {selected.view.acceptanceCriterionId || 'No acceptance criterion'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">Resolved request, response, assertion, and secret values are intentionally hidden. The details below show only safe references and decisions.</p>
            <TraceabilityPanel trace={trace} coverage={trace?.coverage || coverage} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteAllOpen}
        title="Delete all test cases"
        message="This permanently removes all Test Review test cases and their version history for this project. This cannot be undone."
        confirmLabel="Delete all"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={isDeletingAll}
        onConfirm={() => void deleteAllTestCases()}
        onCancel={() => setDeleteAllOpen(false)}
      />
    </main>
  );
};

export default TestReviewPage;
