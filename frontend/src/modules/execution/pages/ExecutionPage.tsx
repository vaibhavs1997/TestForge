import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, Clock3, KeyRound, Play, XCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { SearchBar } from '../../../components/shared/SearchBar';
import { SelectField } from '../../../components/ui/SelectField';
import { queryKeys } from '../../../constants';
import { executionService } from '../services';
import { useExecution } from '../hooks';
import { useReports } from '../../report/hooks';
import { useEnvironments } from '../../environment/hooks/useEnvironments';
import type { ExecutionRun, RunnableSuite } from '../types';

export interface ExecutionPageProps {}

const statusVariant = (status: ExecutionRun['status']) => ({
  Completed: 'success', Failed: 'destructive', Running: 'running', Pending: 'pending', Cancelled: 'secondary',
}[status] as 'success' | 'destructive' | 'running' | 'pending' | 'secondary');

const formatDate = (value: number) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const formatDuration = (milliseconds: number) => milliseconds >= 1000
  ? `${(milliseconds / 1000).toFixed(milliseconds >= 10_000 ? 0 : 1)}s`
  : `${milliseconds}ms`;

export const ExecutionPage: React.FC<ExecutionPageProps> = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';
  const navigate = useNavigate();
  const { runs, isLoading: runsLoading, isError: runsError, error: runsFailure, refetch } = useExecution(projectId);
  const { generateReportAsync } = useReports(projectId);
  const { environments = [], isLoading: environmentsLoading, refetch: refetchEnvironments, updateAsync: updateEnvironment } = useEnvironments(projectId);
  const [selectedSuiteId, setSelectedSuiteId] = React.useState('');
  const [selectedRun, setSelectedRun] = React.useState<ExecutionRun | null>(null);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('all');
  const [launchError, setLaunchError] = React.useState<string | null>(null);
  const [isExecuting, setIsExecuting] = React.useState(false);
  const [tokenDraft, setTokenDraft] = React.useState('');
  const [isSavingToken, setIsSavingToken] = React.useState(false);
  const [tokenSaveMessage, setTokenSaveMessage] = React.useState<string | null>(null);

  const suitesQuery = useQuery({
    queryKey: [...queryKeys.suites(projectId), 'runnable'],
    queryFn: () => executionService.listRunnableSuites(projectId),
    enabled: Boolean(projectId),
  });

  const approvedSuites = React.useMemo(
    () => (suitesQuery.data ?? []).filter((suite) => suite.suiteType === 'requirement'),
    [suitesQuery.data],
  );
  const selectedSuite = approvedSuites.find((suite) => suite.id === selectedSuiteId) ?? null;
  const selectedEnvironment = React.useMemo(
    () => environments.find((environment) => environment.isDefault) ?? environments[0] ?? null,
    [environments],
  );
  const tokenStatus = React.useMemo(() => {
    if (!selectedEnvironment) return { label: 'No environment', tone: 'secondary' as const, detail: 'Configure an environment on the API page.', tokenPreview: '' };
    const variables = selectedEnvironment.variables || {};
    const token = variables.accessToken || variables.access_token || variables.oauthToken || variables.oauth_token;
    const tokenPreview = token ? `Bearer ••••••••${String(token).slice(-8)}` : '';
    if (!token) return { label: 'Token missing', tone: 'destructive' as const, detail: `${selectedEnvironment.name} has no access token.`, tokenPreview };
    const expiry = Number(variables.tokenExpiresAt || variables.expires_at || variables.expiresAt || 0);
    if (expiry > 0 && Date.now() >= expiry) return { label: 'Token expired', tone: 'destructive' as const, detail: `${selectedEnvironment.name} token has expired.`, tokenPreview };
    return { label: 'Token active', tone: 'success' as const, detail: `Token available in ${selectedEnvironment.name}.`, tokenPreview };
  }, [selectedEnvironment]);

  React.useEffect(() => {
    const variables = selectedEnvironment?.variables || {};
    setTokenDraft(String(variables.accessToken || variables.access_token || ''));
    setTokenSaveMessage(null);
  }, [selectedEnvironment?.id, selectedEnvironment?.variables?.accessToken, selectedEnvironment?.variables?.access_token]);

  const saveManualToken = async () => {
    if (!selectedEnvironment || !tokenDraft.trim()) return;
    setIsSavingToken(true);
    setTokenSaveMessage(null);
    try {
      const variables: Record<string, string> = {
        ...(selectedEnvironment.variables || {}),
        accessToken: tokenDraft.trim(),
        access_token: tokenDraft.trim(),
      };
      delete variables.tokenExpiresAt;
      delete variables.expires_at;
      delete variables.expiresAt;
      await updateEnvironment(selectedEnvironment.id, { variables });
      await refetchEnvironments();
      setTokenSaveMessage('Token saved for execution.');
    } catch (error) {
      setTokenSaveMessage(error instanceof Error ? error.message : 'Token could not be saved.');
    } finally {
      setIsSavingToken(false);
    }
  };

  // Keep the execution indicator aligned when a token is regenerated in the
  // API workspace while this page remains mounted.
  React.useEffect(() => {
    const timer = window.setInterval(() => { void refetchEnvironments(); }, 3000);
    return () => window.clearInterval(timer);
  }, [refetchEnvironments]);
  const suiteNames = React.useMemo(() => new Map((suitesQuery.data ?? []).map((suite) => [suite.id, suite.name])), [suitesQuery.data]);

  React.useEffect(() => {
    if (!selectedSuiteId && approvedSuites[0]) setSelectedSuiteId(approvedSuites[0].id);
    if (selectedSuiteId && !approvedSuites.some((suite) => suite.id === selectedSuiteId)) setSelectedSuiteId(approvedSuites[0]?.id ?? '');
  }, [approvedSuites, selectedSuiteId]);

  React.useEffect(() => {
    if (!selectedSuite) return;
    if (!selectedSuite.isRunnable) {
      setLaunchError(selectedSuite.blocker ?? 'This approved suite is not ready to run.');
      return;
    }
  }, [selectedSuite]);

  React.useEffect(() => {
    const latestRun = [...runs].sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!selectedRun && latestRun) setSelectedRun(latestRun);
  }, [runs, selectedRun]);

  const filteredRuns = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const recentRuns = [...runs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
    return recentRuns.filter((run) => {
      const suiteName = suiteNames.get(run.suiteId ?? '') ?? 'Individual run';
      return (status === 'all' || run.status === status) && (!term || suiteName.toLowerCase().includes(term) || run.id.toLowerCase().includes(term));
    });
  }, [runs, search, status, suiteNames]);

  const handleRun = async () => {
    if (!selectedSuite) return;
    setLaunchError(null);
    setIsExecuting(true);
    try {
      const run = await executionService.executeApprovedSuite(projectId, selectedSuite.id);
      setSelectedRun(run as ExecutionRun);
      void refetch();
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'The suite could not be started.');
    } finally {
      setIsExecuting(false);
    }
  };
  const handleViewReport = async (run: ExecutionRun) => {
    try {
      const report = await generateReportAsync({ projectId, executionRunId: run.id });
      navigate(`/projects/${projectId}/reports/${report.id}`);
    } catch (error) {
      setLaunchError(error instanceof Error ? error.message : 'The report could not be generated.');
    }
  };

  return (
    <div className='mx-auto max-w-6xl space-y-6 py-2'>
      <Card className='border-primary/30'>
        <CardHeader>
          <CardTitle>Run approved suite</CardTitle>
          <CardDescription>All test cases, mappings, payloads, and assertions are locked in the suite version below.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {suitesQuery.isLoading ? <p className='text-sm text-text-secondary'>Loading approved suites…</p> : approvedSuites.length === 0 ? (
            <EmptyState icon={<Play className='h-7 w-7' />} title='No approved suites ready to run' description='Approve a suite with ready test cases before starting an execution.' />
          ) : (
            <>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
                <div className='min-w-0 flex-1'>
                  <label className='mb-1 block text-xs font-medium text-text-secondary'>Approved suite</label>
                  <SelectField value={selectedSuiteId} onChange={setSelectedSuiteId} options={approvedSuites.map((suite) => ({ value: suite.id, label: `${suite.name} · ${suite.testCount} tests${suite.isRunnable ? '' : ' · Not ready'}` }))} />
                </div>
                <Button onClick={() => void handleRun()} disabled={!selectedSuite || !selectedSuite.isRunnable || isExecuting} className='min-w-32'>
                  <Play className='mr-2 h-4 w-4' />{isExecuting ? 'Running…' : 'Run suite'}
                </Button>
              </div>
              {selectedSuite && (
                <div className='flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs text-text-secondary'>
                  <span><strong className='text-text'>Version {selectedSuite.version}</strong> approved {selectedSuite.approvedAt ? formatDate(selectedSuite.approvedAt) : 'previously'}</span>
                  <span>{selectedSuite.testCount} test cases</span>
                  <span>{selectedSuite.executionPolicy === 'FailFast' ? 'Stops on first failure' : 'Continues after failures'}</span>
                </div>
              )}
              <div className='flex items-center justify-between gap-3 rounded-lg border border-border bg-background/30 px-3 py-2'>
                <div className='flex min-w-0 items-center gap-2'>
                  <KeyRound className='h-4 w-4 shrink-0 text-text-secondary' />
                  <div className='min-w-0 truncate text-xs text-text-secondary'>
                    <span className='block truncate'>{environmentsLoading ? 'Checking execution environment…' : tokenStatus.detail}</span>
                    {!environmentsLoading && tokenStatus.tokenPreview && <code className='mt-0.5 block truncate font-mono text-[11px] text-text'>{tokenStatus.tokenPreview}</code>}
                  </div>
                </div>
                <Badge variant={tokenStatus.tone}>{tokenStatus.label}</Badge>
              </div>
              <div className='rounded-lg border border-border bg-background/30 p-3'>
                <label className='mb-1 block text-xs font-medium text-text-secondary' htmlFor='execution-manual-token'>Manual token override</label>
                <div className='flex flex-col gap-2 sm:flex-row'>
                  <input
                    id='execution-manual-token'
                    type='password'
                    value={tokenDraft}
                    onChange={(event) => setTokenDraft(event.target.value)}
                    placeholder='Paste bearer token'
                    disabled={!selectedEnvironment || isSavingToken}
                    className='h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-xs text-text outline-none focus:border-primary'
                  />
                  <Button type='button' size='sm' variant='outline' onClick={() => void saveManualToken()} disabled={!selectedEnvironment || !tokenDraft.trim() || isSavingToken}>
                    {isSavingToken ? 'Saving…' : 'Save token'}
                  </Button>
                </div>
                {tokenSaveMessage && <p className='mt-1 text-xs text-text-secondary'>{tokenSaveMessage}</p>}
              </div>
              {launchError && <ErrorAlert title='Unable to run suite' message={launchError} onRetry={() => void handleRun()} />}
            </>
          )}
        </CardContent>
      </Card>

      <section className='space-y-4'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div><h2 className='text-lg font-semibold text-text'>Recent runs</h2><p className='text-sm text-text-secondary'>Showing the 5 most recent runs. Select one to inspect its outcome.</p></div>
          <div className='flex flex-wrap gap-2'><SearchBar value={search} onChange={setSearch} placeholder='Search runs…' className='sm:w-64' /><SelectField value={status} onChange={setStatus} options={[{ value: 'all', label: 'All statuses' }, ...(['Running', 'Completed', 'Failed', 'Cancelled'] as const).map((value) => ({ value, label: value }))]} /></div>
        </div>
        {runsError ? <ErrorAlert title='Failed to load runs' message={runsFailure?.message ?? 'Try again.'} onRetry={() => void refetch()} /> : (
          <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]'>
            <Card>
              <CardContent className='p-0'>
                {runsLoading ? <p className='p-6 text-sm text-text-secondary'>Loading runs…</p> : filteredRuns.length === 0 ? <p className='p-6 text-sm text-text-secondary'>No runs match these filters.</p> : (
                  <div className='divide-y divide-border'>{filteredRuns.map((run) => {
                    const failed = run.summary.failed + (run.summary.blocked ?? 0);
                    return <button key={run.id} type='button' onClick={() => setSelectedRun(run)} className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40 ${selectedRun?.id === run.id ? 'bg-muted/50' : ''}`}>
                      {run.status === 'Completed' ? <CheckCircle2 className='h-5 w-5 shrink-0 text-green-600' /> : run.status === 'Failed' ? <XCircle className='h-5 w-5 shrink-0 text-red-600' /> : <Clock3 className='h-5 w-5 shrink-0 text-primary' />}
                      <span className='min-w-0 flex-1'><span className='block truncate text-sm font-medium text-text'>{suiteNames.get(run.suiteId ?? '') ?? 'Individual execution'}</span><span className='mt-0.5 block text-xs text-text-secondary'>{formatDate(run.createdAt)} · {run.summary.totalSteps} tests</span></span>
                      <span className='hidden text-right text-xs text-text-secondary sm:block'>{run.status === 'Running' ? 'In progress' : `${run.summary.passed} passed${failed ? ` · ${failed} failed` : ''}`}</span>
                      <Badge variant={statusVariant(run.status)}>{run.status}</Badge><ChevronRight className='h-4 w-4 text-text-secondary' />
                    </button>;
                  })}</div>
                )}
              </CardContent>
            </Card>
            <RunSummary run={selectedRun} suiteName={selectedRun ? suiteNames.get(selectedRun.suiteId ?? '') : undefined} onViewReport={(run) => void handleViewReport(run)} />
          </div>
        )}
      </section>
    </div>
  );
};

const RunSummary: React.FC<{ run: ExecutionRun | null; suiteName?: string; onViewReport: (run: ExecutionRun) => void }> = ({ run, suiteName, onViewReport }) => (
  <Card className='h-fit'>
    <CardHeader><CardTitle className='text-base'>Run summary</CardTitle></CardHeader>
    <CardContent>{!run ? <p className='text-sm text-text-secondary'>Select a run to see its result.</p> : <div className='space-y-4'>
      <div><p className='font-medium text-text'>{suiteName ?? 'Individual execution'}</p><p className='mt-1 text-xs text-text-secondary'>{formatDate(run.createdAt)} · {run.id.slice(0, 8)}</p></div>
      <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
      <dl className='grid grid-cols-2 gap-3 text-sm'><div><dt className='text-text-secondary'>Passed</dt><dd className='font-semibold text-green-600'>{run.summary.passed}</dd></div><div><dt className='text-text-secondary'>Failed / blocked</dt><dd className='font-semibold text-red-600'>{run.summary.failed + (run.summary.blocked ?? 0)}</dd></div><div><dt className='text-text-secondary'>Tests</dt><dd className='font-semibold text-text'>{run.summary.totalSteps}</dd></div><div><dt className='text-text-secondary'>Duration</dt><dd className='font-semibold text-text'>{formatDuration(run.summary.duration)}</dd></div></dl>
      {run.status !== 'Running' && <Button variant='outline' size='sm' className='w-full' onClick={() => onViewReport(run)}>View report</Button>}
    </div>}</CardContent>
  </Card>
);

export default ExecutionPage;
