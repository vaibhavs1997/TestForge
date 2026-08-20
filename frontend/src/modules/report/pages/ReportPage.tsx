// External libraries
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { FileText, Download, Plus, CheckCircle, XCircle, AlertTriangle, Eye, Trash2, FileDown, Clock, Play } from 'lucide-react';

// Hooks
import { useReports } from '../hooks';
import { useRequirements } from '../../requirements/hooks';
import { useExecution } from '../../execution/hooks';
import { downloadJsonFile, downloadTextFile } from '../../../utils/downloadFile';
import { Toast } from '../../../components/shared/Toast';

// Types
import type { Report, ReportStatus } from '../types';

export interface ReportPageProps {}

const getStatusBadge = (status: ReportStatus) => {
  const variants: Record<ReportStatus, 'success' | 'destructive' | 'warning' | 'secondary'> = {
    'Passed': 'success',
    'Failed': 'destructive',
    'Partial': 'warning',
    'Completed': 'secondary',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
};

const getStatusIcon = (status: ReportStatus) => {
  switch (status) {
    case 'Passed':
      return <CheckCircle className='h-4 w-4 text-green-600' />;
    case 'Failed':
      return <XCircle className='h-4 w-4 text-red-600' />;
    case 'Partial':
      return <AlertTriangle className='h-4 w-4 text-yellow-600' />;
    case 'Completed':
      return <CheckCircle className='h-4 w-4 text-blue-600' />;
  }
};

export const ReportPage: React.FC<ReportPageProps> = () => {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';
  const { reports: queriedReports, isLoading, isError, error, generateReportAsync, deleteReport, isGenerating, isDeleting } = useReports(projectId);
  const { runs: queriedRuns } = useExecution(projectId);
  const { requirements: queriedRequirements } = useRequirements(projectId);
  const reports = Array.isArray(queriedReports) ? queriedReports : [];
  const runs = Array.isArray(queriedRuns) ? queriedRuns : [];
  const requirements = Array.isArray(queriedRequirements) ? queriedRequirements : [];

  const requirementTitleById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of requirements) m.set(r.id, r.title);
    return m;
  }, [requirements]);

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [suiteFilter, setSuiteFilter] = React.useState<string>('all');
  const [dateFilter, setDateFilter] = React.useState<string>('');
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [executionRunId, setExecutionRunId] = React.useState('');
  const [deleteReportItem, setDeleteReportItem] = React.useState<Report | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');

  const filteredReports = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      const reqTitle = report.requirementIds?.[0]
        ? (requirementTitleById.get(report.requirementIds[0])?.toLowerCase() ?? '')
        : '';
      const overviewTitle = report.sections?.overview?.title?.toLowerCase() ?? '';
      const environmentName = report.environment?.name?.toLowerCase() ?? '';
      const matchesSearch =
        !term ||
        report.id.toLowerCase().includes(term) ||
        (report.executionRunId?.toLowerCase() ?? '').includes(term) ||
        environmentName.includes(term) ||
        reqTitle.includes(term) ||
        overviewTitle.includes(term);
      const matchesStatus = statusFilter === 'all' || report.overallStatus === statusFilter;
      const matchesSuite = suiteFilter === 'all' || (report.suiteId === suiteFilter);
      const matchesDate = !dateFilter || new Date(report.generatedAt).toLocaleDateString().includes(dateFilter);
      return matchesSearch && matchesStatus && matchesSuite && matchesDate;
    });
  }, [search, statusFilter, suiteFilter, dateFilter, reports, requirementTitleById]);

  const uniqueSuites = React.useMemo(() => {
    const suites = reports.filter(r => r.suiteId).map(r => ({ id: r.suiteId!, name: r.suiteId! }));
    return [...new Map(suites.map(s => [s.id, s])).values()];
  }, [reports]);

  const totalPassed = reports.filter(r => r.overallStatus === 'Passed').length;
  const totalFailed = reports.filter(r => r.overallStatus === 'Failed').length;
  const totalPartial = reports.filter(r => r.overallStatus === 'Partial').length;

  const completedRuns = React.useMemo(
    () => runs.filter((r) => r.status === 'Completed' || r.status === 'Failed'),
    [runs],
  );

  const handleGenerateReport = async () => {
    if (!executionRunId.trim()) return;
    try {
      const report = await generateReportAsync({ projectId, executionRunId: executionRunId.trim() });
      setExecutionRunId('');
      setGenerateOpen(false);
      setToastMessage('Report generated');
      setToastType('success');
      setToastOpen(true);
      navigate(`/projects/${projectId}/reports/${report.id}`);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to generate report');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleExportAll = () => {
    if (reports.length === 0) {
      setToastMessage('No reports to export');
      setToastType('error');
      setToastOpen(true);
      return;
    }
    downloadJsonFile(`reports-${projectId}.json`, reports);
    setToastMessage('Reports exported');
    setToastType('success');
    setToastOpen(true);
  };

  const handleExportReportHtml = (report: Report) => {
    const title = report.sections?.overview?.title || report.id;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title></head><body><h1>${title}</h1><pre>${JSON.stringify(report, null, 2)}</pre></body></html>`;
    downloadTextFile(`report-${report.id.slice(0, 8)}.html`, html, 'text/html');
  };

  const handleDeleteReport = () => {
    if (!deleteReportItem) return;
    deleteReport({ projectId, reportId: deleteReportItem.id });
    setDeleteOpen(false);
    setDeleteReportItem(undefined);
  };

  const handleViewReport = (report: Report) => {
    navigate(`/projects/${projectId}/reports/${report.id}`);
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <div className='w-full max-w-none px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Test reports</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Outcomes from test runs — export or post to Jira when a requirement is linked.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline' onClick={handleExportAll}>
            <Download className='mr-2 h-4 w-4' />
            Export All
          </Button>
          <Button variant='outline' onClick={() => navigate(`/projects/${projectId}/execution`)}>
            <Play className='mr-2 h-4 w-4' />
            Executions
          </Button>
          <Button onClick={() => setGenerateOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Total Reports</p>
                <p className='text-2xl font-bold text-text'>{reports.length}</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
                <FileText className='h-6 w-6 text-blue-600' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Passed</p>
                <p className='text-2xl font-bold text-text'>{totalPassed}</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center'>
                <CheckCircle className='h-6 w-6 text-green-600' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Failed</p>
                <p className='text-2xl font-bold text-text'>{totalFailed}</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center'>
                <XCircle className='h-6 w-6 text-red-600' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Partial</p>
                <p className='text-2xl font-bold text-text'>{totalPartial}</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center'>
                <AlertTriangle className='h-6 w-6 text-yellow-600' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2 flex-wrap'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search by requirement or environment...' className='sm:w-80' />
          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            hideSelectedOption
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'Passed', label: 'Passed' },
              { value: 'Failed', label: 'Failed' },
              { value: 'Partial', label: 'Partial' },
              { value: 'Completed', label: 'Completed' },
            ]}
          />
          <SelectField
            value={suiteFilter}
            onChange={setSuiteFilter}
            hideSelectedOption
            options={[{ value: 'all', label: 'All Suites' }, ...uniqueSuites.map((suite) => ({ value: suite.id, label: suite.name }))]}
          />
          <input
            type='text'
            placeholder='Date filter'
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'
          />
        </div>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className='p-0'>
          {isLoading ? (
            <div className='p-8 text-center text-text-secondary'>Loading reports...</div>
          ) : isError ? (
            <div className='p-8 text-center text-error'>Error: {error?.message || 'Unknown error'}</div>
          ) : filteredReports.length === 0 ? (
            <EmptyState
              icon={<FileText className='h-12 w-12' />}
              title={search ? 'No matching reports' : 'No reports yet'}
              description={search ? 'Try adjusting your search criteria.' : 'Generate a report from a completed execution run.'}
              action={search ? undefined : { label: 'Generate Report', onClick: () => setGenerateOpen(true) }}
            />
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-border'>
                  <tr className='text-left text-xs text-text-secondary'>
                    <th className='px-4 py-3 font-medium'>Requirement</th>
                    <th className='px-4 py-3 font-medium'>Environment</th>
                    <th className='px-4 py-3 font-medium'>Status</th>
                    <th className='px-4 py-3 font-medium'>Steps</th>
                    <th className='px-4 py-3 font-medium'>Passed</th>
                    <th className='px-4 py-3 font-medium'>Failed</th>
                    <th className='px-4 py-3 font-medium'>Duration</th>
                    <th className='px-4 py-3 font-medium'>Generated At</th>
                    <th className='px-4 py-3 font-medium'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className='hover:bg-surface transition-colors cursor-pointer'
                      onClick={() => handleViewReport(report)}
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2 max-w-xs'>
                          {getStatusIcon(report.overallStatus)}
                          <span className='text-sm font-medium text-text truncate' title={report.requirementIds?.[0] ? requirementTitleById.get(report.requirementIds[0]) : undefined}>
                            {report.requirementIds?.[0]
                              ? requirementTitleById.get(report.requirementIds[0]) ?? report.sections?.overview?.title
                              : report.sections?.overview?.title ?? 'Test run'}
                          </span>
                        </div>
                        <span className='text-xs text-text-secondary font-mono'>{report.id.slice(0, 8)}</span>
                      </td>
                      <td className='px-4 py-3'>
                        <Badge variant='outline' className='text-xs'>{report.environment?.name ?? 'Unknown'}</Badge>
                      </td>
                      <td className='px-4 py-3'>{getStatusBadge(report.overallStatus)}</td>
                      <td className='px-4 py-3 text-sm text-text'>{report.totalSteps}</td>
                      <td className='px-4 py-3 text-sm text-green-600'>{report.passedSteps}</td>
                      <td className='px-4 py-3 text-sm text-red-600'>{report.failedSteps}</td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>{formatDuration(report.executionDuration)}</td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>
                        {new Date(report.generatedAt).toLocaleString()}
                      </td>
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => handleViewReport(report)} title='View'>
                            <Eye className='h-4 w-4' />
                          </Button>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' title='Export HTML' onClick={() => handleExportReportHtml(report)}>
                            <FileDown className='h-4 w-4' />
                          </Button>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => { setDeleteReportItem(report); setDeleteOpen(true); }} title='Delete'>
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Report Modal */}
      {generateOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <Card className='w-full max-w-lg'>
            <CardContent className='p-6 space-y-4'>
              <div>
                <h3 className='text-lg font-semibold text-text'>Generate Report</h3>
                <p className='text-sm text-text-secondary mt-1'>Generate a report from a completed execution run.</p>
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Execution run *</label>
                {completedRuns.length > 0 ? (
                  <SelectField
                    value={executionRunId}
                    onChange={setExecutionRunId}
                    className='mt-1 w-full'
                    placeholder='Select a completed run…'
                    options={completedRuns.map((run) => ({
                      value: run.id,
                      label: `${run.id.slice(0, 8)} — ${run.status} — ${new Date(run.createdAt).toLocaleString()}`,
                    }))}
                  />
                ) : (
                  <>
                    <input
                      value={executionRunId}
                      onChange={(e) => setExecutionRunId(e.target.value)}
                      placeholder='Enter execution run ID'
                      className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                    />
                    <p className='text-xs text-text-secondary mt-1'>
                      No completed runs yet. Run tests from Execution or paste a run ID.
                    </p>
                  </>
                )}
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button variant='outline' onClick={() => setGenerateOpen(false)}>Cancel</Button>
                <Button onClick={() => void handleGenerateReport()} disabled={!executionRunId.trim() || isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title='Delete Report'
        message={`Deleting report "${deleteReportItem?.id.slice(0, 8)}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDeleteReport}
        onCancel={() => { setDeleteOpen(false); setDeleteReportItem(undefined); }}
      />

      <Toast message={toastMessage} open={toastOpen} onClose={() => setToastOpen(false)} type={toastType} />
    </div>
  );
};

export default ReportPage;
