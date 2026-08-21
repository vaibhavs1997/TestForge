// External libraries
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ArrowLeft, Download, FileDown, CheckCircle, XCircle, AlertCircle, Clock, Shield, FileText, Globe, Key, AlertTriangle, ListChecks, Send } from 'lucide-react';

// Hooks
import { useReport } from '../hooks';
import { reportService } from '../services';
import { requirementService } from '../../requirements/services/requirementService';
import { downloadJsonFile, downloadTextFile } from '../../../utils/downloadFile';
import { ReportExportMenu } from '../../../components/shared/ReportExportMenu';

// Types
import type { ReportStatus } from '../types';
import { executionService } from '../../execution/services';
import { useProjectApiOperations } from '../../api/hooks/useProjectApiOperations';
import { resolveExecutionPlanOperationLabel, explainBlockedPrerequisites } from '../../execution/utils/dependencyDisplay';
import type { ExecutionPlan } from '../../requirements/types';
import { testDesignService } from '../../requirements/services/testDesignService';

export interface ReportDetailsPageProps {}

const getStatusBadge = (status: ReportStatus) => {
  const variants: Record<ReportStatus, 'success' | 'destructive' | 'warning' | 'secondary'> = {
    'Passed': 'success',
    'Failed': 'destructive',
    'Partial': 'warning',
    'Completed': 'secondary',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
};

const getStepStatusIcon = (status: string) => {
  switch (status) {
    case 'Passed':
      return <CheckCircle className='h-4 w-4 text-green-600' />;
    case 'Failed':
      return <XCircle className='h-4 w-4 text-red-600' />;
    case 'Skipped':
      return <AlertCircle className='h-4 w-4 text-gray-600' />;
    default:
      return <Clock className='h-4 w-4 text-gray-400' />;
  }
};

const getValidationStatusIcon = (status: string) => {
  switch (status) {
    case 'Passed':
      return <CheckCircle className='h-3 w-3 text-green-600 mt-0.5' />;
    case 'Failed':
      return <XCircle className='h-3 w-3 text-red-600 mt-0.5' />;
    case 'Warning':
      return <AlertCircle className='h-3 w-3 text-yellow-600 mt-0.5' />;
    default:
      return <Clock className='h-3 w-3 text-gray-400 mt-0.5' />;
  }
};

const getPriorityBadge = (priority: string) => {
  const variants: Record<string, 'destructive' | 'warning' | 'secondary'> = {
    'High': 'destructive',
    'Medium': 'warning',
    'Low': 'secondary',
  };
  return <Badge variant={variants[priority] || 'secondary'}>{priority}</Badge>;
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const ReportDetailsPage: React.FC<ReportDetailsPageProps> = () => {
  const { projectId: routeProjectId, reportId } = useParams<{ projectId: string; reportId: string }>();
  const navigate = useNavigate();
  const projectId = routeProjectId || '1';

  const { data: report, isLoading, isError, error } = useReport(projectId, reportId);
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'execution' | 'validation' | 'recommendations' | 'timeline' | 'assertions'
  >('overview');
  const [jiraConfigured, setJiraConfigured] = React.useState(false);
  const [jiraIssueKey, setJiraIssueKey] = React.useState<string | null>(null);
  const [linkedRequirementTitle, setLinkedRequirementTitle] = React.useState<string | null>(null);
  const [publishingJira, setPublishingJira] = React.useState(false);
  const [jiraPublishMessage, setJiraPublishMessage] = React.useState<string | null>(null);
  const [executionPlans, setExecutionPlans] = React.useState<ExecutionPlan[]>([]);
  const [testCaseStatements, setTestCaseStatements] = React.useState<Record<string, string>>({});
  const { operations: projectOperations } = useProjectApiOperations(projectId);

  React.useEffect(() => {
    requirementService
      .getJiraStatus()
      .then((s) => setJiraConfigured(Boolean(s?.configured)))
      .catch(() => setJiraConfigured(false));
  }, []);

  React.useEffect(() => {
    const reqId = report?.requirementIds?.[0];
    if (!reqId) {
      setJiraIssueKey(null);
      setLinkedRequirementTitle(null);
      return;
    }
    requirementService
      .getRequirement(projectId, reqId)
      .then((req) => {
        setJiraIssueKey(req.jiraIssueKey ?? null);
        setLinkedRequirementTitle(req.title ?? null);
      })
      .catch(() => {
        setJiraIssueKey(null);
        setLinkedRequirementTitle(null);
      });
  }, [projectId, report?.requirementIds]);

  React.useEffect(() => {
    executionService.listExecutionPlans(projectId).then(setExecutionPlans).catch(() => setExecutionPlans([]));
  }, [projectId]);

  React.useEffect(() => {
    const requirementId = report?.requirementIds?.[0];
    if (!requirementId) {
      setTestCaseStatements({});
      return;
    }
    testDesignService.listByRequirement(projectId, requirementId)
      .then((designs) => setTestCaseStatements(Object.fromEntries(
        designs.filter((design) => design.title?.trim()).map((design) => [design.id, design.title!.trim()]),
      )))
      .catch(() => setTestCaseStatements({}));
  }, [projectId, report?.requirementIds]);

  const handlePublishToJira = async () => {
    if (!reportId) return;
    setPublishingJira(true);
    setJiraPublishMessage(null);
    try {
      const result = await reportService.publishToJira(projectId, reportId);
      setJiraPublishMessage(`Posted to ${result.issueKey}`);
    } catch (err: any) {
      setJiraPublishMessage(err?.response?.data?.message || err?.message || 'Failed to post to Jira');
    } finally {
      setPublishingJira(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (isLoading) {
    return (
      <div className='w-full max-w-none px-4 py-8'>
        <div className='p-8 text-center text-text-secondary'>Loading report...</div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className='w-full max-w-none px-4 py-8'>
        <EmptyState
          icon={<FileText className='h-12 w-12' />}
          title='Report not found'
          description={error?.message || 'The report you are looking for does not exist.'}
          action={{ label: 'Back to Reports', onClick: () => navigate(`/projects/${projectId}/reports`) }}
        />
      </div>
    );
  }

  const sections = report.sections;
  const stepResults = sections.stepResults || [];
  const validationResults = sections.validationResults || [];
  const recommendations = sections.recommendations || [];
  const executionTimeline = sections.executionTimeline || [];
  const runtimeVariables = sections.runtimeVariablesCaptured || {};
  const failures: any[] = [];
  const dependencyGraph: Array<{ executionPlanId: string; prerequisitePlanIds: string[] }> = [];
  const blockedSteps = report.blockedSteps ?? sections.executionSummary.blockedSteps ?? stepResults.filter((step: any) => step.status === 'Blocked').length;
  const failedPlanIds = new Set<string>();
  const passPercent = Math.round((report.passedSteps / Math.max(report.totalSteps, 1)) * 100);

  return (
    <div className='w-full max-w-none px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 rounded-2xl border border-border bg-surface/70 p-5'>
        <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' className='mb-3 -ml-2 text-text-secondary' onClick={() => navigate(`/projects/${projectId}/reports`)}>
            <ArrowLeft className='h-4 w-4' />
            Back to reports
          </Button>
          <div>
            <div className='flex items-center gap-3 flex-wrap'>
              <h1 className='text-2xl font-bold text-text'>
                {linkedRequirementTitle || sections.overview.title}
              </h1>
              {getStatusBadge(report.overallStatus)}
              {jiraIssueKey && (
                <Badge variant="outline" className="text-xs">
                  {jiraIssueKey}
                </Badge>
              )}
            </div>
            <p className='mt-1 text-sm text-text-secondary'>
              {report.passedSteps}/{report.totalSteps} test cases passed · {formatDuration(report.executionDuration)}
              {sections.overview.description ? ` · ${sections.overview.description}` : ''}
            </p>
            <div className='mt-4 h-2 max-w-2xl overflow-hidden rounded-full bg-background' aria-label={`${passPercent}% of test cases passed`}>
              <div className={`h-full rounded-full transition-all ${report.overallStatus === 'Failed' ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${passPercent}%` }} />
            </div>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <ReportExportMenu
            onExportHtml={() => {
              const title = report.sections?.overview?.title || report.id;
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title></head><body><h1>${title}</h1><pre>${JSON.stringify(report, null, 2)}</pre></body></html>`;
              downloadTextFile(`report-${report.id.slice(0, 8)}.html`, html, 'text/html');
            }}
            onExportJson={() => downloadJsonFile(`report-${report.id.slice(0, 8)}.json`, report)}
            onExportCsv={() => {
              const rows = [
                ['reportId', 'status', 'totalSteps', 'passed', 'failed', 'durationMs'],
                [
                  report.id,
                  report.overallStatus,
                  String(report.totalSteps),
                  String(report.passedSteps),
                  String(report.failedSteps),
                  String(report.executionDuration),
                ],
              ];
              downloadTextFile(
                `report-${report.id.slice(0, 8)}.csv`,
                rows.map((r) => r.join(',')).join('\n'),
                'text/csv',
              );
            }}
            onExportPdf={() => {
              const title = report.sections?.overview?.title || report.id;
              const rows = (report.sections?.stepResults || []).map((step: any, index: number) => `
                <tr><td>${index + 1}</td><td>${escapeHtml(step.request?.method || '')} ${escapeHtml(step.request?.url || '')}</td><td class="${escapeHtml(step.status)}">${escapeHtml(step.status)}</td><td>${escapeHtml(step.response?.status ?? '')}</td><td>${escapeHtml(formatDuration(step.response?.duration || 0))}</td></tr>`).join('');
              const printWindow = window.open('', '_blank', 'noopener,noreferrer');
              if (!printWindow) return;
              printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} - TestForge report</title><style>
                *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:32px;font-size:12px}h1{font-size:22px;margin:0 0 6px}h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #d5dbe5;padding-bottom:5px}.meta{color:#596579;margin-bottom:18px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.metric{border:1px solid #d5dbe5;border-radius:6px;padding:10px}.metric strong{display:block;font-size:17px;margin-top:3px}.success{color:#087f42}.failed,.Failed{color:#b42318}.Passed{color:#087f42}table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border:1px solid #d5dbe5;padding:7px;text-align:left;vertical-align:top}th{background:#eef2f7}@media print{body{margin:16px}}
              </style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">Status: ${escapeHtml(report.overallStatus)} · Generated from execution run ${escapeHtml(report.executionRunId || '')}</div><div class="summary"><div class="metric">Total test cases<strong>${report.totalSteps}</strong></div><div class="metric">Passed<strong class="success">${report.passedSteps}</strong></div><div class="metric">Failed<strong class="failed">${report.failedSteps}</strong></div><div class="metric">Duration<strong>${escapeHtml(formatDuration(report.executionDuration))}</strong></div></div><h2>Test-case results</h2><table><thead><tr><th>#</th><th>Request</th><th>Status</th><th>HTTP</th><th>Duration</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
              printWindow.document.close();
              printWindow.focus();
              window.setTimeout(() => printWindow.print(), 250);
            }}
          />
          {jiraConfigured && jiraIssueKey && reportId && (
            <Button
              variant='outline'
              size='sm'
              title={`Post summary to Jira ${jiraIssueKey}`}
              disabled={publishingJira}
              onClick={() => void handlePublishToJira()}
            >
              <Send className='h-4 w-4' />
              {publishingJira ? 'Posting…' : 'Post to Jira'}
            </Button>
          )}
        </div>
        </div>
      </div>
      {jiraPublishMessage && (
        <p className='mb-4 text-sm text-text-secondary'>{jiraPublishMessage}</p>
      )}

      {/* Tabs */}
      <div className='mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-2'>
        {([
          { key: 'overview' as const, label: 'Overview', icon: FileText },
          { key: 'execution' as const, label: 'Validation', icon: ListChecks },
        ]).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-[9px] ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text'
              }`}
            >
              <Icon className='h-4 w-4' />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className='space-y-6'>
          {/* Summary Cards */}
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-4'>
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-text-secondary'>Total test cases</p>
                    <p className='text-2xl font-bold text-text'>{report.totalSteps}</p>
                  </div>
                  <div className='h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
                    <ListChecks className='h-6 w-6 text-blue-600' />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-text-secondary'>Passed</p>
                    <p className='text-2xl font-bold text-green-600'>{report.passedSteps}</p>
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
                    <p className='text-2xl font-bold text-red-600'>{report.failedSteps}</p>
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
                    <p className='text-sm font-medium text-text-secondary'>Duration</p>
                    <p className='text-2xl font-bold text-text'>{formatDuration(report.executionDuration)}</p>
                  </div>
                  <div className='h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center'>
                    <Clock className='h-6 w-6 text-purple-600' />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Report Info */}
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Report Information</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Report ID</span>
                  <span className='font-mono text-text'>{report.id}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Execution Run</span>
                  <span className='font-mono text-text'>{report.executionRunId.slice(0, 8)}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Generated By</span>
                  <span className='font-medium text-text'>{report.generatedBy}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Generated At</span>
                  <span className='font-medium text-text'>{new Date(report.generatedAt).toLocaleString()}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Report Version</span>
                  <span className='font-medium text-text'>{report.reportVersion}</span>
                </div>
              </CardContent>
            </Card>

            {/* Environment Info */}
            <Card>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <Globe className='h-4 w-4' />
                  Environment Information
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Environment</span>
                  <span className='font-medium text-text'>{report.environment.name}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Base URL</span>
                  <span className='font-mono text-text text-xs'>{report.environment.baseUrl}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Environment ID</span>
                  <span className='font-mono text-text text-xs'>{report.environment.environmentId}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Requirements covered */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Requirements covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-wrap gap-2'>
                {sections.requirementsCovered.length > 0 ? (
                  sections.requirementsCovered.map((reqId) => (
                    <Badge key={reqId} variant='outline'>{reqId}</Badge>
                  ))
                ) : (
                  <span className='text-sm text-text-secondary'>No requirements covered.</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Runtime Variables Captured */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <Key className='h-4 w-4' />
                Runtime Variables Captured
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(runtimeVariables).length > 0 ? (
                <div className='space-y-2'>
                  {Object.entries(runtimeVariables).map(([key, value]) => (
                    <div key={key} className='flex items-center justify-between text-sm border border-border rounded-lg p-2'>
                      <span className='font-mono text-text'>{key}</span>
                      <span className='font-mono text-text-secondary text-xs'>
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className='text-sm text-text-secondary'>No runtime variables captured.</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'execution' && (
        <div className='space-y-6'>
          {/* Test-case summary */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Test-case summary</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-center'>
                <div className='relative h-32 w-32'>
                  <svg className='h-32 w-32 transform -rotate-90'>
                    <circle cx='64' cy='64' r='56' stroke='currentColor' strokeWidth='12' fill='none' className='text-gray-200' />
                    <circle
                      cx='64'
                      cy='64'
                      r='56'
                      stroke='currentColor'
                      strokeWidth='12'
                      fill='none'
                      strokeDasharray={`${(report.passedSteps / Math.max(report.totalSteps, 1)) * 351.86} 351.86`}
                      className='text-green-600'
                    />
                  </svg>
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <div className='text-center'>
                      <div className='text-3xl font-bold text-text'>
                        {Math.round((report.passedSteps / Math.max(report.totalSteps, 1)) * 100)}%
                      </div>
                      <div className='text-xs text-text-secondary'>Passed</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Total test cases</span>
                  <span className='font-medium text-text'>{report.totalSteps}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Passed</span>
                  <span className='font-medium text-green-600'>{report.passedSteps}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Failed</span>
                  <span className='font-medium text-red-600'>{report.failedSteps}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Skipped</span>
                  <span className='font-medium text-text'>{report.skippedSteps}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Blocked</span>
                  <span className='font-medium text-orange-600'>{blockedSteps}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Duration</span>
                  <span className='font-medium text-text'>{formatDuration(report.executionDuration)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test-case results */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Test-case results</CardTitle>
            </CardHeader>
            <CardContent>
              {stepResults.length > 0 ? (
                <div className='space-y-3'>
                  {stepResults.map((step: any, idx: number) => (
                    <div key={step.stepId || idx} className='border border-border rounded-lg p-3'>
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          {getStepStatusIcon(step.status)}
                          <span className='text-sm font-medium text-text'>
                            Test case {step.executionOrder}: {step.statement || step.testCaseStatement || testCaseStatements[executionPlans.find((plan) => plan.id === step.stepId)?.testDesignId || ''] || 'Executed API validation'}
                          </span>
                        </div>
                        <span className='text-xs text-text-secondary'>
                          {step.request?.method} {step.request?.url}
                        </span>
                      </div>
                      {step.response && (
                        <div className='text-xs text-text-secondary mt-1'>
                          Status: {step.response.status} • Duration: {step.response.duration}ms
                        </div>
                      )}
                      {step.error && (
                        <p className='text-xs text-red-600 mt-1'>{step.error}</p>
                      )}
                      <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                        <details className='rounded-lg border border-border bg-background/40 px-3 py-2'>
                          <summary className='cursor-pointer text-xs font-medium text-text'>Request body</summary>
                          <pre className='mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-[11px] text-text-secondary'>
                            {step.request?.body === undefined ? 'No request body' : JSON.stringify(step.request.body, null, 2)}
                          </pre>
                        </details>
                        <details className='rounded-lg border border-border bg-background/40 px-3 py-2'>
                          <summary className='cursor-pointer text-xs font-medium text-text'>Response body</summary>
                          <pre className='mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-[11px] text-text-secondary'>
                            {step.response?.body === undefined ? 'No response body' : JSON.stringify(step.response.body, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className='text-sm text-text-secondary'>No step results available.</span>
              )}
            </CardContent>
          </Card>

          {false && dependencyGraph.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Dependency execution chain</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {dependencyGraph.map((edge) => (
                    <div key={edge.executionPlanId} className='rounded border border-border p-3 text-xs'>
                      <div className='font-medium text-text'>{resolveExecutionPlanOperationLabel(edge.executionPlanId, executionPlans, projectOperations)}</div>
                      <div className='font-mono text-[10px] text-text-secondary'>{edge.executionPlanId}</div>
                      <div className='mt-1 text-text-secondary'>
                        {edge.prerequisitePlanIds.length > 0 ? `Prerequisite → dependent: ${edge.prerequisitePlanIds.map((id) => resolveExecutionPlanOperationLabel(id, executionPlans, projectOperations)).join(', ')} → ${resolveExecutionPlanOperationLabel(edge.executionPlanId, executionPlans, projectOperations)}` : 'No prerequisites'}
                      </div>
                      {failedPlanIds.has(edge.executionPlanId) && edge.prerequisitePlanIds.length > 0 ? <div className='mt-1 text-orange-600'>{explainBlockedPrerequisites(edge.prerequisitePlanIds, failedPlanIds, executionPlans, projectOperations)}</div> : null}
                      {stepResults.find((step: any) => step.stepId === edge.executionPlanId && step.status === 'Blocked')?.error ? (
                        <div className='mt-1 text-orange-600'>
                          {stepResults.find((step: any) => step.stepId === edge.executionPlanId && step.status === 'Blocked')?.error}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failures */}
          {false && failures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className='text-base flex items-center gap-2'>
                  <XCircle className='h-4 w-4 text-red-600' />
                  Failures ({failures.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {failures.map((step: any, idx: number) => (
                    <div key={step.stepId || idx} className='border border-red-200 dark:border-red-900 rounded-lg p-3 bg-red-50 dark:bg-red-950'>
                      <div className='flex items-center justify-between mb-2'>
                        <div className='flex items-center gap-2'>
                          <XCircle className='h-4 w-4 text-red-600' />
                          <span className='text-sm font-medium text-text'>Step {step.executionOrder}</span>
                        </div>
                        <span className='text-xs text-text-secondary'>
                          {step.request?.method} {step.request?.url}
                        </span>
                      </div>
                      {step.error && (
                        <p className='text-xs text-red-600 mt-1'>{step.error}</p>
                      )}
                      {step.response && (
                        <div className='text-xs text-text-secondary mt-1'>
                          Status: {step.response.status} • Duration: {step.response.duration}ms
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'validation' && (
        <div className='space-y-6'>
          {/* Validation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <Shield className='h-4 w-4' />
                Validation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Total Validations</span>
                <span className='font-medium text-text'>{report.validationSummary.total}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Passed</span>
                <span className='font-medium text-green-600'>{report.validationSummary.passed}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Failed</span>
                <span className='font-medium text-red-600'>{report.validationSummary.failed}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Warnings</span>
                <span className='font-medium text-yellow-600'>{report.validationSummary.warnings}</span>
              </div>
            </CardContent>
          </Card>

          {/* Validation Results */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              {validationResults.length > 0 ? (
                <div className='max-h-[32rem] space-y-3 overflow-y-auto scrollbar-none pr-1'>
                  {validationResults.map((validation: any, vIdx: number) => (
                    <div key={vIdx} className='flex items-start gap-2 text-xs border border-border rounded-lg p-3'>
                      {getValidationStatusIcon(validation.status)}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between'>
                          <span className='font-medium text-text'>{validation.rule?.name || 'Validation'}</span>
                          <span className='text-text-secondary'>{validation.duration}ms</span>
                        </div>
                        <p className='text-text-secondary mt-0.5'>
                          Expected: {JSON.stringify(validation.expected)}
                        </p>
                        <p className='text-text-secondary'>
                          Actual: {JSON.stringify(validation.actual)}
                        </p>
                        {validation.error && (
                          <p className='text-red-600 mt-1'>{validation.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className='text-sm text-text-secondary'>No validation results available.</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className='space-y-6'>
          {/* Recommendation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <AlertTriangle className='h-4 w-4' />
                Recommendation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Total Recommendations</span>
                <span className='font-medium text-text'>{report.recommendationSummary.total}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>High Priority</span>
                <span className='font-medium text-red-600'>{report.recommendationSummary.high}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Medium Priority</span>
                <span className='font-medium text-yellow-600'>{report.recommendationSummary.medium}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Low Priority</span>
                <span className='font-medium text-text'>{report.recommendationSummary.low}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations List */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className='space-y-3'>
                  {recommendations.map((rec: any, idx: number) => (
                    <div key={rec.id || idx} className='border border-border rounded-lg p-3'>
                      <div className='flex items-center justify-between mb-2'>
                        <span className='text-sm font-medium text-text'>{rec.title}</span>
                        {getPriorityBadge(rec.priority)}
                      </div>
                      <p className='text-xs text-text-secondary mb-1'>{rec.reason}</p>
                      <p className='text-xs text-text'>
                        <span className='font-medium'>Suggested Action:</span> {rec.suggestedAction}
                      </p>
                      <div className='flex items-center gap-2 mt-2'>
                        <Badge variant='outline' className='text-xs'>{rec.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className='text-sm text-text-secondary'>No recommendations available.</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <Clock className='h-4 w-4' />
                Execution Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {executionTimeline.length > 0 ? (
                <div className='space-y-3'>
                  {executionTimeline.map((step: any, idx: number) => (
                    <div key={step.stepId || idx} className='flex items-start gap-3'>
                      <div className='flex-shrink-0 mt-1'>
                        {getStepStatusIcon(step.status)}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-medium text-text'>Step {step.executionOrder}</span>
                          <span className='text-xs text-text-secondary'>{step.request?.method} {step.request?.url}</span>
                        </div>
                        {step.error && (
                          <p className='text-xs text-red-600 mt-1'>{step.error}</p>
                        )}
                        {step.response && (
                          <p className='text-xs text-text-secondary mt-1'>
                            Status: {step.response.status} • {step.response.duration}ms
                          </p>
                        )}
                        {step.startedAt && (
                          <p className='text-xs text-text-secondary mt-0.5'>
                            Started: {new Date(step.startedAt).toLocaleTimeString()}
                            {step.completedAt && ` • Completed: ${new Date(step.completedAt).toLocaleTimeString()}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className='text-sm text-text-secondary'>No timeline data available.</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'assertions' && (
        <div className='space-y-6'>
          {/* Reusable Assertions Summary */}
          <Card>
            <CardHeader>
              <CardTitle className='text-base flex items-center gap-2'>
                <Shield className='h-4 w-4' />
                Reusable Assertions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stepResults.length > 0 && stepResults.some((step: any) => step.reusableAssertions && step.reusableAssertions.length > 0) ? (
                <div className='space-y-3'>
                  {stepResults.map((step: any, idx: number) => {
                    const reusableAssertions = step.reusableAssertions || [];
                    if (reusableAssertions.length === 0) return null;
                    
                    return (
                      <div key={step.stepId || idx} className='border border-border rounded-lg p-3'>
                        <div className='flex items-center justify-between mb-2'>
                          <span className='text-sm font-medium text-text'>Step {step.executionOrder}</span>
                          {getStepStatusIcon(step.status)}
                        </div>
                        <div className='space-y-2'>
                          {reusableAssertions.map((assertion: any, aIdx: number) => (
                            <div key={assertion.id || aIdx} className='flex items-start gap-2 text-xs border border-border rounded p-2'>
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center justify-between mb-1'>
                                  <span className='font-medium text-text'>{assertion.name}</span>
                                  <div className='flex items-center gap-1'>
                                    <Badge variant='outline' className='text-xs'>{assertion.type}</Badge>
                                    <Badge variant={assertion.enabled ? 'success' : 'secondary'} className='text-xs'>
                                      {assertion.enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className='flex items-center gap-2 text-text-secondary'>
                                  <span>Category: {assertion.category}</span>
                                  <span>Severity: {assertion.severity}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className='text-sm text-text-secondary'>No reusable assertions were executed in this report.</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReportDetailsPage;
