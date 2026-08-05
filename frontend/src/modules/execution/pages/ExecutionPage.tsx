// External libraries
import React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { Play, Clock, CheckCircle, XCircle, AlertCircle, Copy, Download, RefreshCw, Eye, MoreVertical, ChevronDown, Shield, Database, Settings } from 'lucide-react';
import { profileService } from '../services/profileService';
import type { ExecutionProfile } from '../types/profile';
import { useNavigate } from 'react-router-dom';

// Hooks
import { useExecution } from '../hooks';

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
    default:
      return <Clock className='h-4 w-4 text-gray-400' />;
  }
};

export const ExecutionPage: React.FC<ExecutionPageProps> = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';

  const { runs, isLoading, isError, error, startExecution, isStarting } = useExecution(projectId);

  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');
  const [selectedRun, setSelectedRun] = React.useState<ExecutionRun | null>(null);
  const [activeTab, setActiveTab] = React.useState<'details' | 'validation' | 'testdata'>('details');
  const [validationFilter, setValidationFilter] = React.useState<string>('all');
  const [profiles, setProfiles] = React.useState<ExecutionProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>('');
  const navigate = useNavigate();

  // Load profiles
  React.useEffect(() => {
    profileService.listByProject(projectId).then(setProfiles).catch((err) => {
      logger.error('Failed to load execution profiles', err);
      setProfiles([]);
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
    if (runs.length > 0 && !selectedRun) {
      setSelectedRun(runs[0]);
    }
  }, [runs, selectedRun]);

  const filteredRuns = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesSearch =
        !term ||
        run.id.toLowerCase().includes(term) ||
        run.executionPlanId.toLowerCase().includes(term) ||
        run.requirementId.toLowerCase().includes(term);
      const matchesFilter = filter === 'all' || run.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, runs]);

  const handleStartExecution = async (executionPlanId: string) => {
    try {
      await startExecution({ projectId, executionPlanId, executionProfileId: selectedProfileId });
    } catch (err) {
      logger.error('Failed to start execution', err);
    }
  };

  // Get the currently selected profile object for summary display
  const selectedProfile = React.useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  const totalPassed = runs.filter(e => e.summary.passed).length;
  const totalFailed = runs.filter(e => e.summary.failed).length;
  const totalRunning = runs.filter(e => e.status === 'Running').length;
  const totalPending = runs.filter(e => e.status === 'Pending').length;

  const breadcrumbItems = [
    { label: 'Projects', to: '/projects' },
    { label: 'Project', to: `/projects/${projectId}/overview` },
    { label: 'Execution' },
  ];

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <PageHeader
        title='Executions'
        description='View and monitor all test executions.'
        breadcrumb={breadcrumbItems}
      >
        <Button variant='outline' onClick={() => navigate('profiles')}>
          <Settings className='mr-2 h-4 w-4' />
          Manage Profiles
        </Button>
        <select
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'
        >
          {profiles.filter(p => p.enabled).map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}{profile.isDefault ? ' (Default)' : ''}
            </option>
          ))}
        </select>
        <Button
          onClick={() => selectedProfileId && handleStartExecution(selectedProfileId)}
          disabled={!selectedProfileId || isStarting}
        >
          <Play className='mr-2 h-4 w-4' />
          Start Execution
        </Button>
      </PageHeader>

      {/* Profile Summary */}
      {selectedProfile && (
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle className='text-base'>Execution Profile: {selectedProfile.name}</CardTitle>
            <CardDescription>{selectedProfile.description || 'No description'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
              <div>
                <p className='text-xs text-text-secondary'>Failure Mode</p>
                <p className='text-sm font-medium text-text'>{selectedProfile.failureMode}</p>
              </div>
              <div>
                <p className='text-xs text-text-secondary'>Timeout</p>
                <p className='text-sm font-medium text-text'>{selectedProfile.timeout}ms</p>
              </div>
              <div>
                <p className='text-xs text-text-secondary'>Retry</p>
                <p className='text-sm font-medium text-text'>
                  {selectedProfile.retryPolicy.enabled
                    ? `${selectedProfile.retryPolicy.maxRetries}x / ${selectedProfile.retryPolicy.retryDelay}ms`
                    : 'Disabled'}
                </p>
              </div>
              <div>
                <p className='text-xs text-text-secondary'>Assertion Mode</p>
                <p className='text-sm font-medium text-text'>{selectedProfile.assertionMode}</p>
              </div>
              <div>
                <p className='text-xs text-text-secondary'>Dataset Strategy</p>
                <p className='text-sm font-medium text-text'>{selectedProfile.datasetSelectionStrategy}</p>
              </div>
              <div>
                <p className='text-xs text-text-secondary'>Runtime Reset</p>
                <p className='text-sm font-medium text-text'>{selectedProfile.runtimeVariableReset ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className='text-xs text-text-secondary'>Environment</p>
                <p className='text-sm font-medium text-text'>{selectedProfile.defaultEnvironmentId || 'N/A'}</p>
              </div>
              <div>
                <p className='text-xs text-text-secondary'>Parallelism</p>
                <p className='text-sm font-medium text-text'>
                  {selectedProfile.parallelism.enabled
                    ? `${selectedProfile.parallelism.maxConcurrent} concurrent`
                    : 'Disabled'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-5'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Total Executions</p>
                <p className='text-2xl font-bold text-text'>{runs.length}</p>
                <p className='text-xs text-text-secondary mt-1'>+{runs.length} this week</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
                <Play className='h-6 w-6 text-blue-600' />
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
                <p className='text-xs text-text-secondary mt-1'>{runs.length > 0 ? Math.round((totalPassed / runs.length) * 100) : 0}%</p>
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
                <p className='text-xs text-text-secondary mt-1'>{runs.length > 0 ? Math.round((totalFailed / runs.length) * 100) : 0}%</p>
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
                <p className='text-sm font-medium text-text-secondary'>Running</p>
                <p className='text-2xl font-bold text-text'>{totalRunning}</p>
                <p className='text-xs text-text-secondary mt-1'>{runs.length > 0 ? Math.round((totalRunning / runs.length) * 100) : 0}%</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center'>
                <AlertCircle className='h-6 w-6 text-yellow-600' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Pending</p>
                <p className='text-2xl font-bold text-text'>{totalPending}</p>
                <p className='text-xs text-text-secondary mt-1'>{runs.length > 0 ? Math.round((totalPending / runs.length) * 100) : 0}%</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center'>
                <Clock className='h-6 w-6 text-gray-600' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search executions...' className='sm:w-80' />
          <select 
            className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value='all'>All Status</option>
            <option value='Completed'>Completed</option>
            <option value='Failed'>Failed</option>
            <option value='Running'>Running</option>
            <option value='Pending'>Pending</option>
            <option value='Cancelled'>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Executions Table */}
        <Card className='lg:col-span-2'>
          <CardContent className='p-0'>
            {isLoading ? (
              <div className='flex items-center justify-center py-8'>
                <p className='text-sm text-text-secondary'>Loading executions...</p>
              </div>
            ) : isError ? (
              <ErrorAlert
                title='Failed to load executions'
                message={error?.message || 'An unexpected error occurred while loading executions.'}
                onRetry={() => window.location.reload()}
              />
            ) : filteredRuns.length === 0 ? (
              <EmptyState
                icon={<Play className='h-8 w-8' />}
                title='No executions found'
                description='Start an execution to see it here.'
              />
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b border-border'>
                    <tr className='text-left text-xs text-text-secondary'>
                      <th className='px-4 py-3 font-medium'>Execution ID</th>
                      <th className='px-4 py-3 font-medium'>Requirement</th>
                      <th className='px-4 py-3 font-medium'>Status</th>
                      <th className='px-4 py-3 font-medium'>Steps</th>
                      <th className='px-4 py-3 font-medium'>Passed</th>
                      <th className='px-4 py-3 font-medium'>Failed</th>
                      <th className='px-4 py-3 font-medium'>Started At</th>
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
                          <div className='flex items-center gap-2'>
                            {getStatusBadge(run.status)}
                            <span className='text-xs font-mono text-text'>{run.id.slice(0, 8)}</span>
                          </div>
                        </td>
                        <td className='px-4 py-3 text-sm text-text'>{run.requirementId.slice(0, 8)}</td>
                        <td className='px-4 py-3 text-sm text-text'>{run.executionPlanId.slice(0, 8)}</td>
                        <td className='px-4 py-3 text-sm text-text'>{run.summary.totalSteps}</td>
                        <td className='px-4 py-3 text-sm text-green-600'>{run.summary.passed}</td>
                        <td className='px-4 py-3 text-sm text-red-600'>{run.summary.failed}</td>
                        <td className='px-4 py-3 text-xs text-text-secondary'>
                          {new Date(run.createdAt).toLocaleString()}
                        </td>
                        <td className='px-4 py-3'>
                          <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                            <MoreVertical className='h-4 w-4' />
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
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <Copy className='h-4 w-4' />
                </Button>
              </div>
              {/* Tabs */}
              <div className='flex gap-2 mt-4'>
                <Button
                  variant={activeTab === 'details' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </Button>
                <Button
                  variant={activeTab === 'testdata' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('testdata')}
                  className='gap-2'
                >
                  <Database className='h-4 w-4' />
                  Resolved Test Data
                </Button>
                <Button
                  variant={activeTab === 'validation' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setActiveTab('validation')}
                  className='gap-2'
                >
                  <Shield className='h-4 w-4' />
                  Validation
                </Button>
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
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-text-secondary'>Requirement</span>
                      <span className='font-medium text-text'>{selectedRun.requirementId.slice(0, 8)}</span>
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
                              <span className='text-xs text-text-secondary'>{step.request.method} {step.request.url}</span>
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
                  <Button variant='outline' size='sm' className='flex flex-col items-center gap-1 h-auto py-2'>
                    <Eye className='h-4 w-4' />
                    <span className='text-xs'>View Report</span>
                  </Button>
                  <Button variant='outline' size='sm' className='flex flex-col items-center gap-1 h-auto py-2'>
                    <Download className='h-4 w-4' />
                    <span className='text-xs'>Download Logs</span>
                  </Button>
                  <Button variant='outline' size='sm' className='flex flex-col items-center gap-1 h-auto py-2'>
                    <RefreshCw className='h-4 w-4' />
                    <span className='text-xs'>Rerun Execution</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ExecutionPage;