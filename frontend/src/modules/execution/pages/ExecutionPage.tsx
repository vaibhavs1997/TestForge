// External libraries
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { Play, Clock, CheckCircle, XCircle, AlertCircle, Copy, Download, RefreshCw, Eye, ChevronDown, Shield, Database, Settings, ListChecks, Trash2 } from 'lucide-react';
import { profileService } from '../services/profileService';
import { executionService } from '../services';
import type { ExecutionProfile } from '../types/profile';
import type { ExecutionPlan } from '../../requirements/types';
import { useNavigate } from 'react-router-dom';
import { Toast } from '../../../components/shared/Toast';
import { downloadJsonFile } from '../../../utils/downloadFile';
import { useReports } from '../../report/hooks';

// Hooks
import { useExecution } from '../hooks';
import { ExecutionRunHero } from '../components/ExecutionRunHero';
import { requirementService } from '../../requirements/services/requirementService';
import { useRequirements } from '../../requirements/hooks';
import { useProjectApiOperations } from '../../api/hooks/useProjectApiOperations';
import { resolveOperationLabel } from '../../requirements/utils/operationDisplay';
import { resolveExecutionPlanOperationLabel, explainBlockedPrerequisites } from '../utils/dependencyDisplay';

// Types
import type { ExecutionRun, StepStatus } from '../types';
import { logger } from '../../../utils/logger';

export interface ExecutionPageProps {}

const getStatusBadge = (status: ExecutionRun['status']) => {
  const variants: Record<ExecutionRun['status'], 'success' | 'destructive' | 'running' | 'pending' | 'secondary'> = {
    'Completed': 'success',
    'Failed': 'destructive',
    'Running': 'running',
    'Pending': 'pending',
    'Cancelled': 'secondary',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
};

const getStepStatusIcon = (status: StepStatus) => {
  switch (status) {
    case 'Running':
      return <Play className='h-4 w-4 text-blue-600 animate-pulse' />;
    case 'Passed':
      return <CheckCircle className='h-4 w-4 text-green-600' />;
    case 'Failed':
      return <XCircle className='h-4 w-4 text-red-600' />;
    case 'Skipped':
      return <AlertCircle className='h-4 w-4 text-gray-600' />;
    case 'Blocked':
      return <AlertCircle className='h-4 w-4 text-orange-600' />;
    default:
      return <Clock className='h-4 w-4 text-gray-400' />;
  }
};

export const ExecutionPage: React.FC<ExecutionPageProps> = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';
  const [searchParams] = useSearchParams();
  const requirementIdFromUrl = searchParams.get('requirementId') ?? '';

  const {
    runs,
    isLoading,
    isError,
    error,
    startExecutionAsync,
    isStarting,
    refetch,
    deleteExecutionAsync,
    deleteAllExecutionsAsync,
    isDeleting,
  } = useExecution(projectId);
  const { generateReportAsync } = useReports(projectId);
  const { requirements } = useRequirements(projectId);
  const { operations: projectOperations } = useProjectApiOperations(projectId);

  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');
  const [selectedRun, setSelectedRun] = React.useState<ExecutionRun | null>(null);
  const [activeTab, setActiveTab] = React.useState<'details' | 'validation' | 'testdata'>('details');
  const [advancedMenuOpen, setAdvancedMenuOpen] = React.useState(false);
  const advancedMenuRef = React.useRef<HTMLDivElement>(null);
  const [validationFilter, setValidationFilter] = React.useState<string>('all');
  const [profiles, setProfiles] = React.useState<ExecutionProfile[]>([]);
  const [executionPlans, setExecutionPlans] = React.useState<ExecutionPlan[]>([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>('');
  const [selectedExecutionPlanId, setSelectedExecutionPlanId] = React.useState<string>('');
  const [selectedRequirementId, setSelectedRequirementId] = React.useState<string>(requirementIdFromUrl);
  const [isBuildingPlans, setIsBuildingPlans] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const navigate = useNavigate();

  React.useEffect(() => {
    if (requirementIdFromUrl) {
      setSelectedRequirementId(requirementIdFromUrl);
    }
  }, [requirementIdFromUrl]);

  // Load profiles
  React.useEffect(() => {
    profileService.listByProject(projectId).then(setProfiles).catch((err) => {
      logger.error('Failed to load execution profiles', err);
      setProfiles([]);
    });
  }, [projectId]);

  React.useEffect(() => {
    executionService.listExecutionPlans(projectId).then(setExecutionPlans).catch((err) => {
      logger.error('Failed to load execution plans', err);
      setExecutionPlans([]);
    });
  }, [projectId]);

  // Set default profile
  React.useEffect(() => {
    if (profiles.length > 0 && !selectedProfileId) {
      const defaultProfile = profiles.find(p => p.isDefault);
      setSelectedProfileId(defaultProfile?.id || profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  React.useEffect(() => {
    const readyPlans = executionPlans.filter((p) => p.status !== 'Disabled');
    if (readyPlans.length > 0 && !selectedExecutionPlanId) {
      const sorted = [...readyPlans].sort((a, b) => a.executionOrder - b.executionOrder);
      setSelectedExecutionPlanId(sorted[0].id);
    }
  }, [executionPlans, selectedExecutionPlanId]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (advancedMenuRef.current && !advancedMenuRef.current.contains(e.target as Node)) {
        setAdvancedMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  React.useEffect(() => {
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0]);
    }
  }, [runs, selectedRun]);

  const requirementById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requirements) {
      map.set(r.id, r.title);
    }
    return map;
  }, [requirements]);
  const failedPlanIds = React.useMemo(() => new Set((selectedRun?.stepResults ?? []).filter((step) => step.status === 'Failed' || step.status === 'Blocked').map((step) => step.stepId)), [selectedRun]);

  const filteredRuns = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return runs.filter((run) => {
      const reqTitle = requirementById.get(run.requirementId)?.toLowerCase() ?? '';
      const matchesSearch =
        !term ||
        run.id.toLowerCase().includes(term) ||
        run.requirementId.toLowerCase().includes(term) ||
        reqTitle.includes(term);
      const matchesFilter = filter === 'all' || run.status === filter;
      const matchesRequirement =
        !selectedRequirementId || run.requirementId === selectedRequirementId;
      return matchesSearch && matchesFilter && matchesRequirement;
    });
  }, [search, filter, runs, requirementById, selectedRequirementId]);

  const handleStartExecution = async () => {
    if (!selectedExecutionPlanId) {
      setToastMessage('Build execution steps for this requirement first.');
      setToastType('error');
      setToastOpen(true);
      return;
    }
    try {
      // The Run tests action is an individual-plan execution. Suite execution
      // uses SuitePage → /suites/:suiteId/execute and creates one combined run.
      await startExecutionAsync({ projectId, executionPlanId: selectedExecutionPlanId, executionProfileId: selectedProfileId || undefined });
      setToastMessage('Started 1 test case');
      setToastType('success');
      setToastOpen(true);
      void refetch();
    } catch (err) {
      logger.error('Failed to start execution', err);
      const axiosMsg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setToastMessage(axiosMsg || (err instanceof Error ? err.message : 'Failed to start execution'));
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleBuildExecutionPlans = async () => {
    if (!selectedRequirementId) return;
    setIsBuildingPlans(true);
    try {
      await requirementService.planExecution(projectId, selectedRequirementId);
      const plans = await executionService.listExecutionPlans(projectId);
      setExecutionPlans(plans);
      const forReq = plans
        .filter((p) => p.requirementId === selectedRequirementId && p.status !== 'Disabled')
        .sort((a, b) => a.executionOrder - b.executionOrder);
      if (forReq[0]) {
        setSelectedExecutionPlanId(forReq[0].id);
      }
      setToastMessage(
        forReq.length > 0
          ? `Built ${forReq.length} execution step${forReq.length === 1 ? '' : 's'}.`
          : 'No steps were created — ensure this requirement has included test cases.',
      );
      setToastType(forReq.length > 0 ? 'success' : 'error');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to build execution plans', err);
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setToastMessage(message || (err instanceof Error ? err.message : 'Failed to build execution steps'));
      setToastType('error');
      setToastOpen(true);
    } finally {
      setIsBuildingPlans(false);
    }
  };

  const handleViewReportForRun = async (run: ExecutionRun) => {
    try {
      const report = await generateReportAsync({ projectId, executionRunId: run.id });
      navigate(`/projects/${projectId}/reports/${report.id}`);
    } catch (err) {
      logger.error('Failed to generate report', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to generate report');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleDownloadRunLogs = (run: ExecutionRun) => {
    downloadJsonFile(`execution-${run.id.slice(0, 8)}.json`, run);
    setToastMessage('Execution log downloaded');
    setToastType('success');
    setToastOpen(true);
  };

  const handleRerun = async (run: ExecutionRun) => {
    try {
      await startExecutionAsync({
        projectId,
        executionPlanId: run.executionPlanId,
        executionProfileId: selectedProfileId || undefined,
      });
      setToastMessage('Execution re-started');
      setToastType('success');
      setToastOpen(true);
      void refetch();
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to re-run execution');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleDeleteRun = async (run: ExecutionRun) => {
    if (!window.confirm(`Delete execution ${run.id.slice(0, 8)}? This cannot be undone.`)) return;
    try {
      await deleteExecutionAsync({ projectId, runId: run.id });
      if (selectedRun?.id === run.id) setSelectedRun(null);
      setToastMessage('Execution deleted');
      setToastType('success');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to delete execution', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete execution');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleDeleteAllRuns = async () => {
    if (runs.length === 0) return;
    if (!window.confirm(`Delete all ${runs.length} execution runs for this project? This cannot be undone.`)) return;
    try {
      const result = await deleteAllExecutionsAsync(projectId);
      setSelectedRun(null);
      setToastMessage(`Deleted ${result?.deleted ?? runs.length} execution runs`);
      setToastType('success');
      setToastOpen(true);
    } catch (err) {
      logger.error('Failed to delete executions', err);
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete executions');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const copyRunId = async (runId: string) => {
    try {
      await navigator.clipboard.writeText(runId);
      setToastMessage('Execution ID copied');
      setToastType('success');
      setToastOpen(true);
    } catch {
      setToastMessage('Could not copy to clipboard');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const readyExecutionPlans = React.useMemo(
    () => executionPlans.filter((p) => p.status !== 'Disabled'),
    [executionPlans],
  );

  const totalPassed = runs.filter(e => e.summary.passed).length;
  const totalFailed = runs.filter(e => e.summary.failed).length;
  const totalRunning = runs.filter(e => e.status === 'Running').length;
  const totalPending = runs.filter(e => e.status === 'Pending').length;

  return (
    <div className='w-full max-w-none px-0 py-0'>
      <ExecutionRunHero
        projectId={projectId}
        requirements={requirements}
        executionPlans={executionPlans}
        profiles={profiles}
        selectedRequirementId={selectedRequirementId}
        onRequirementChange={setSelectedRequirementId}
        selectedExecutionPlanId={selectedExecutionPlanId}
        onPlanChange={setSelectedExecutionPlanId}
        selectedProfileId={selectedProfileId}
        onProfileChange={setSelectedProfileId}
        onStart={handleStartExecution}
        isStarting={isStarting}
        onBuildExecutionPlans={handleBuildExecutionPlans}
        isBuildingPlans={isBuildingPlans}
      />

      {/* Run summary */}
      <div className='mb-6 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-text-secondary'>
        <span>
          <span className='font-semibold text-text'>{runs.length}</span> runs
        </span>
        <span>
          <span className='font-semibold text-green-600'>{totalPassed}</span> with passes
        </span>
        <span>
          <span className='font-semibold text-red-600'>{totalFailed}</span> with failures
        </span>
        {totalRunning > 0 && (
          <span>
            <span className='font-semibold text-yellow-600'>{totalRunning}</span> running
          </span>
        )}
        {totalPending > 0 && (
          <span>
            <span className='font-semibold text-text'>{totalPending}</span> pending
          </span>
        )}
      </div>

      {/* Search and Filters */}
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search executions...' className='sm:w-80' />
          <SelectField
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Failed', label: 'Failed' },
              { value: 'Running', label: 'Running' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => void handleDeleteAllRuns()}
          disabled={runs.length === 0 || isDeleting}
          title='Delete all execution runs for this project'
        >
          <Trash2 className='mr-2 h-4 w-4' aria-hidden />
          Delete all runs
        </Button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Executions Table */}
        <Card className={selectedRun ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <CardContent className='p-0'>
            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <p className='text-sm text-text-secondary'>Loading executions...</p>
              </div>
            ) : isError ? (
              <ErrorAlert
                title='Failed to load executions'
                message={error?.message || 'An unexpected error occurred while loading executions.'}
                onRetry={() => void refetch()}
              />
            ) : filteredRuns.length === 0 ? (
              <EmptyState
                icon={<Play className='h-8 w-8' />}
                title='No executions found'
                description='Plan execution from Requirements, pick a plan above, then start an execution.'
                action={{
                  label: 'Go to Requirements',
                  onClick: () => navigate(`/projects/${projectId}/requirements`),
                }}
              />
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b border-border'>
                    <tr className='text-left text-xs text-text-secondary'>
                      <th className='px-4 py-3 font-medium'>Run</th>
                      <th className='px-4 py-3 font-medium'>Requirement</th>
                      <th className='px-4 py-3 font-medium'>Status</th>
                      <th className='px-4 py-3 font-medium'>Steps</th>
                      <th className='px-4 py-3 font-medium'>Passed</th>
                      <th className='px-4 py-3 font-medium'>Failed</th>
                      <th className='px-4 py-3 font-medium'>Started</th>
                      <th className='px-4 py-3 font-medium'></th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border'>
                    {filteredRuns.map((run) => (
                      <tr 
                        key={run.id} 
                        className={`hover:bg-surface transition-colors cursor-pointer ${
                          selectedRun?.id === run.id ? 'bg-surface' : ''
                        }`}
                        onClick={() => setSelectedRun(run)}
                      >
                        <td className='px-4 py-3'>
                          <span className='text-xs font-mono text-text-secondary'>{run.id.slice(0, 8)}</span>
                        </td>
                        <td className='px-4 py-3 text-sm text-text max-w-[200px] truncate' title={requirementById.get(run.requirementId)}>
                          {requirementById.get(run.requirementId) ?? run.requirementId.slice(0, 8)}
                        </td>
                        <td className='px-4 py-3'>{getStatusBadge(run.status)}</td>
                        <td className='px-4 py-3 text-sm text-text'>{run.summary.totalSteps}</td>
                        <td className='px-4 py-3 text-sm text-green-600'>{run.summary.passed}</td>
                        <td className='px-4 py-3 text-sm text-red-600'>{run.summary.failed}</td>
                        <td className='px-4 py-3 text-xs text-text-secondary'>
                          {new Date(run.createdAt).toLocaleString()}
                        </td>
                        <td className='px-4 py-3'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-8 w-8 p-0 text-red-500 hover:text-red-600'
                            title='Delete run'
                            aria-label={`Delete run ${run.id.slice(0, 8)}`}
                            disabled={isDeleting}
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteRun(run);
                            }}
                          >
                            <Trash2 className='h-4 w-4' aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Execution Details */}
        {selectedRun && (
          <Card className='lg:col-span-1'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Execution Details</CardTitle>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => void copyRunId(selectedRun.id)} title='Copy run ID' aria-label='Copy run ID'>
                  <Copy className='h-4 w-4' aria-hidden />
                </Button>
              </div>
              {/* Tabs */}
              <div className='mt-4 flex flex-wrap items-center gap-2'>
                <Button
                  variant={activeTab === 'details' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </Button>
                <div className='relative' ref={advancedMenuRef}>
                  <Button
                    variant={activeTab !== 'details' ? 'default' : 'outline'}
                    size='sm'
                    className='gap-1'
                    onClick={() => setAdvancedMenuOpen((v) => !v)}
                  >
                    <Settings className='h-4 w-4' />
                    Advanced
                    <ChevronDown className='h-3 w-3' />
                  </Button>
                  {advancedMenuOpen && (
                    <div className='absolute left-0 z-20 mt-1 min-w-[180px] rounded-lg border border-border bg-surface py-1 shadow-lg'>
                      <button
                        type='button'
                        className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-muted'
                        onClick={() => {
                          setActiveTab('validation');
                          setAdvancedMenuOpen(false);
                        }}
                      >
                        <Shield className='h-4 w-4' />
                        Validation
                      </button>
                      <button
                        type='button'
                        className='flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-muted'
                        onClick={() => {
                          setActiveTab('testdata');
                          setAdvancedMenuOpen(false);
                        }}
                      >
                        <Database className='h-4 w-4' />
                        Resolved test data
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {activeTab === 'details' && (
                <>
                  {/* Execution ID */}
                  <div>
                    <h3 className='text-lg font-semibold text-text flex items-center gap-2'>
                      {selectedRun.id.slice(0, 8)}
                      {getStatusBadge(selectedRun.status)}
                    </h3>
                  </div>

                  {/* Execution Info */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Execution Plan</span>
                      <span className='font-medium text-text'>{selectedRun.executionPlanId.slice(0, 8)}</span>
                    </div>
                    {selectedRun.suiteId ? (
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-text-secondary'>Run type</span>
                        <Badge variant='outline'>Combined suite run</Badge>
                      </div>
                    ) : null}
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Requirement</span>
                      <span className='font-medium text-text text-right max-w-[60%] truncate'>
                        {requirementById.get(selectedRun.requirementId) ?? selectedRun.requirementId.slice(0, 8)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Started At</span>
                      <span className='font-medium text-text'>{new Date(selectedRun.createdAt).toLocaleString()}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Failure Mode</span>
                      <span className='font-medium text-text'>{selectedRun.failureMode}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Total Steps</span>
                      <span className='font-medium text-text'>{selectedRun.summary.totalSteps}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Passed</span>
                      <span className='font-medium text-green-600'>{selectedRun.summary.passed}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Failed</span>
                      <span className='font-medium text-red-600'>{selectedRun.summary.failed}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Skipped</span>
                      <span className='font-medium text-text'>{selectedRun.summary.skipped}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Blocked</span>
                      <span className='font-medium text-orange-600'>{selectedRun.summary.blocked ?? 0}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Duration</span>
                      <span className='font-medium text-text'>{selectedRun.summary.duration}ms</span>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'testdata' && (
                <>
                  {/* Resolved Test Data Section */}
                  <div className='space-y-3'>
                    <h4 className='text-sm font-semibold text-text'>Resolved Test Data</h4>
                    {selectedRun.stepResults.length === 0 || !selectedRun.stepResults.some(s => s.resolvedTestData) ? (
                      <p className='text-xs text-text-secondary'>No test data resolved for this execution.</p>
                    ) : (
                      <div className='space-y-3 max-h-96 overflow-y-auto'>
                        {selectedRun.stepResults
                          .filter(step => step.resolvedTestData)
                          .map((step, idx) => {
                            const testData = step.resolvedTestData!;
                            const resolvedEntries = Object.entries(testData.resolvedValues);
                            
                            return (
                              <div key={step.stepId} className='border border-border rounded-lg p-3'>
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='text-xs font-medium text-text'>Step {step.executionOrder}</span>
                                  {testData.datasetId && (
                                    <span className='text-xs text-text-secondary font-mono'>
                                      Dataset: {testData.datasetId.slice(0, 8)}
                                    </span>
                                  )}
                                </div>
                                
                                {resolvedEntries.length > 0 ? (
                                  <div className='space-y-2'>
                                    {resolvedEntries.map(([fieldPath, resolvedValue]) => (
                                      <div key={fieldPath} className='flex items-start gap-2 text-xs'>
                                        <div className='flex-1 min-w-0'>
                                          <div className='flex items-center justify-between'>
                                            <span className='font-medium text-text'>{fieldPath}</span>
                                            <span className='text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'>
                                              {resolvedValue.sourceType}
                                            </span>
                                          </div>
                                          <p className='text-text-secondary mt-0.5 font-mono'>
                                            Value: {JSON.stringify(resolvedValue.value)}
                                          </p>
                                          {resolvedValue.rowId && (
                                            <p className='text-text-secondary'>
                                              Row ID: {resolvedValue.rowId}
                                            </p>
                                          )}
                                          {resolvedValue.columnName && (
                                            <p className='text-text-secondary'>
                                              Column: {resolvedValue.columnName}
                                            </p>
                                          )}
                                          {resolvedValue.variableName && (
                                            <p className='text-text-secondary'>
                                              Variable: {resolvedValue.variableName}
                                            </p>
                                          )}
                                          {resolvedValue.envVariableName && (
                                            <p className='text-text-secondary'>
                                              Env Variable: {resolvedValue.envVariableName}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className='text-xs text-text-secondary'>No values resolved for this step.</p>
                                )}
                                
                                {testData.sequentialPositions.length > 0 && (
                                  <div className='mt-2 pt-2 border-t border-border'>
                                    <p className='text-xs text-text-secondary'>
                                      Sequential Positions: {testData.sequentialPositions.map(([key, pos]) => `${key.slice(0, 20)}...: ${pos}`).join(', ')}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </>
              )}

               {activeTab === 'validation' && (
                 <>
                   {/* Validation Stats */}
                   <div className='space-y-2'>
                     <h4 className='text-sm font-semibold text-text'>Validation Summary</h4>
                     <div className='flex items-center justify-between text-sm'>
                       <span className='text-text-secondary'>Passed</span>
                       <span className='font-medium text-green-600'>{selectedRun.summary.validationPassed}</span>
                     </div>
                     <div className='flex items-center justify-between text-sm'>
                       <span className='text-text-secondary'>Failed</span>
                       <span className='font-medium text-red-600'>{selectedRun.summary.validationFailed}</span>
                     </div>
                     <div className='flex items-center justify-between text-sm'>
                       <span className='text-text-secondary'>Warnings</span>
                       <span className='font-medium text-yellow-600'>{selectedRun.summary.validationWarnings}</span>
                     </div>
                   </div>

                   {/* Generated Assertions */}
                   {selectedRun.stepResults.some(step => step.assertions && step.assertions.length > 0) && (
                     <div className='space-y-2'>
                       <h4 className='text-sm font-semibold text-text'>Generated Assertions</h4>
                       <div className='space-y-2 max-h-48 overflow-y-auto'>
                         {selectedRun.stepResults.map((step, idx) => {
                           if (!step.assertions || step.assertions.length === 0) return null;
                           return (
                             <div key={step.stepId} className='border border-border rounded-lg p-2'>
                               <span className='text-xs font-medium text-text-secondary'>Step {step.executionOrder}</span>
                               <div className='mt-1 space-y-1'>
                                 {step.assertions.map((assertion: any, aIdx: number) => (
                                   <div key={aIdx} className='text-xs text-text-secondary'>
                                     • {assertion.type} {assertion.operator} {assertion.path}
                                     <span className={`ml-2 ${assertion.passed ? 'text-green-600' : 'text-red-600'}`}>
                                       {assertion.passed ? '✓' : '✗'}
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}

                   {/* Reusable Assertions */}
                   {selectedRun.stepResults.some(step => step.reusableAssertions && step.reusableAssertions.length > 0) && (
                     <div className='space-y-2'>
                       <h4 className='text-sm font-semibold text-text'>Reusable Assertions</h4>
                       <div className='space-y-2 max-h-48 overflow-y-auto'>
                         {selectedRun.stepResults.map((step, idx) => {
                           const reusableAssertions = step.reusableAssertions || [];
                           if (reusableAssertions.length === 0) return null;
                           
                           return (
                             <div key={step.stepId} className='border border-border rounded-lg p-2'>
                               <span className='text-xs font-medium text-text-secondary'>Step {step.executionOrder}</span>
                               <div className='mt-1 space-y-1'>
                                 {reusableAssertions.map((assertion: any, aIdx: number) => (
                                   <div key={assertion.id || aIdx} className='text-xs text-text-secondary'>
                                     • {assertion.name} ({assertion.type})
                                     <span className={`ml-2 ${assertion.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                                       [{assertion.enabled ? 'Enabled' : 'Disabled'}]
                                     </span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}

                   {/* Validation Results by Step */}
                   {selectedRun.stepResults.length > 0 && (
                     <div>
                       <h4 className='text-sm font-semibold text-text mb-3'>Validation Results</h4>
                       <div className='space-y-3 max-h-96 overflow-y-auto'>
                         {selectedRun.stepResults.map((step, idx) => {
                           const filteredValidations = step.validations?.filter((v: any) => 
                             validationFilter === 'all' || v.status === validationFilter
                           ) || [];
                           
                           if (filteredValidations.length === 0) return null;
                           
                           return (
                             <div key={step.stepId} className='border border-border rounded-lg p-3'>
                               <div className='flex items-center justify-between mb-2'>
                                 <span className='text-xs font-medium text-text'>Step {step.executionOrder}</span>
                                 {getStepStatusIcon(step.status)}
                               </div>
                               <div className='space-y-2'>
                                 {filteredValidations.map((validation, vIdx) => (
                                   <div key={vIdx} className='flex items-start gap-2 text-xs'>
                                     {validation.status === 'Passed' && <CheckCircle className='h-3 w-3 text-green-600 mt-0.5' />}
                                     {validation.status === 'Failed' && <XCircle className='h-3 w-3 text-red-600 mt-0.5' />}
                                     {validation.status === 'Warning' && <AlertCircle className='h-3 w-3 text-yellow-600 mt-0.5' />}
                                     <div className='flex-1 min-w-0'>
                                       <div className='flex items-center justify-between'>
                                         <span className='font-medium text-text'>{validation.rule.name}</span>
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
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   )}
                 </>
               )}

              {/* Execution Timeline */}
              {selectedRun.stepResults.length > 0 && activeTab === 'details' && (
                <div>
                  <h4 className='text-sm font-semibold text-text mb-3'>Execution Timeline</h4>
                  <div className='space-y-3'>
                    {[...selectedRun.stepResults]
                      .sort((a, b) => a.executionOrder - b.executionOrder)
                      .map((step, idx) => (
                        <div key={step.stepId} className='flex items-start gap-3'>
                          <div className='flex-shrink-0 mt-1'>
                            {getStepStatusIcon(step.status)}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2'>
                              <span className='text-xs font-medium text-text'>Step {step.executionOrder}</span>
                              <span className='text-xs text-text-secondary'>
                                {resolveOperationLabel(projectOperations, executionPlans.find((plan) => plan.id === step.stepId)?.operationId)}
                              </span>
                            </div>
                            {step.error && (
                              <p className='text-xs text-red-600 mt-1'>{step.error}</p>
                            )}
                            {step.response && (
                              <p className='text-xs text-text-secondary mt-1'>
                                Status: {step.response.status} • {step.response.duration}ms
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === 'details' && selectedRun.dependencyGraph && selectedRun.dependencyGraph.length > 0 ? (
                <div>
                  <h4 className='mb-3 text-sm font-semibold text-text'>Dependency relationships</h4>
                  <div className='space-y-2'>
                    {selectedRun.dependencyGraph.map((edge) => (
                      <div key={edge.executionPlanId} className='rounded border border-border bg-surface/40 p-2 text-xs'>
                        <div className='font-medium text-text'>{resolveExecutionPlanOperationLabel(edge.executionPlanId, executionPlans, projectOperations)}</div>
                        <div className='font-mono text-[10px] text-text-secondary'>{edge.executionPlanId}</div>
                        <div className='mt-1 text-text-secondary'>
                          {edge.prerequisitePlanIds.length > 0 ? `Prerequisites: ${edge.prerequisitePlanIds.map((id) => resolveExecutionPlanOperationLabel(id, executionPlans, projectOperations)).join(', ')}` : 'No prerequisites'}
                        </div>
                        {failedPlanIds.has(edge.executionPlanId) && edge.prerequisitePlanIds.length > 0 ? <div className='mt-1 text-orange-600'>{explainBlockedPrerequisites(edge.prerequisitePlanIds, failedPlanIds, executionPlans, projectOperations)}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Execution Summary */}
              <div>
                <h4 className='text-sm font-semibold text-text mb-3'>Execution Summary</h4>
                <div className='flex items-center justify-center'>
                  <div className='relative h-24 w-24'>
                    <svg className='h-24 w-24 transform -rotate-90'>
                      <circle
                        cx='48'
                        cy='48'
                        r='40'
                        stroke='currentColor'
                        strokeWidth='8'
                        fill='none'
                        className='text-gray-200'
                      />
                      <circle
                        cx='48'
                        cy='48'
                        r='40'
                        stroke='currentColor'
                        strokeWidth='8'
                        fill='none'
                        strokeDasharray={`${(selectedRun.summary.passed / Math.max(selectedRun.summary.totalSteps, 1)) * 251.2} 251.2`}
                        className='text-green-600'
                      />
                    </svg>
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-text'>
                          {Math.round((selectedRun.summary.passed / Math.max(selectedRun.summary.totalSteps, 1)) * 100)}%
                        </div>
                        <div className='text-xs text-text-secondary'>Passed</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className='text-sm font-semibold text-text mb-3'>Quick Actions</h4>
                <div className='grid grid-cols-3 gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex flex-col items-center gap-1 h-auto py-2'
                    onClick={() => void handleViewReportForRun(selectedRun)}
                  >
                    <Eye className='h-4 w-4' />
                    <span className='text-xs'>View Report</span>
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex flex-col items-center gap-1 h-auto py-2'
                    onClick={() => handleDownloadRunLogs(selectedRun)}
                  >
                    <Download className='h-4 w-4' />
                    <span className='text-xs'>Download Logs</span>
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex flex-col items-center gap-1 h-auto py-2'
                    onClick={() => void handleRerun(selectedRun)}
                  >
                    <RefreshCw className='h-4 w-4' />
                    <span className='text-xs'>Rerun Execution</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <Toast message={toastMessage} open={toastOpen} onClose={() => setToastOpen(false)} type={toastType} />
    </div>
  );
};

export default ExecutionPage;
