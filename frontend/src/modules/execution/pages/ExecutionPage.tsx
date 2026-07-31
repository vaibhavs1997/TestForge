// External libraries
import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Play, Square, Clock, CheckCircle, XCircle, AlertCircle, Copy, Download, RefreshCw, Eye, MoreVertical, ChevronDown } from 'lucide-react';

// Styles

export interface ExecutionPageProps {}

interface TestExecution {
  id: string;
  suiteName: string;
  environment: string;
  status: 'passed' | 'failed' | 'running' | 'blocked';
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  startedAt: string;
  duration: string;
  triggeredBy: string;
}

interface ExecutionDetails {
  id: string;
  suiteName: string;
  environment: string;
  startedAt: string;
  triggeredBy: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
}

export const ExecutionPage: React.FC<ExecutionPageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');
  const [selectedExecution, setSelectedExecution] = React.useState<ExecutionDetails | null>(null);

  const executions: TestExecution[] = [
    {
      id: 'EXE-128',
      suiteName: 'User Authentication Suite',
      environment: 'DEV',
      status: 'passed',
      totalTests: 24,
      passed: 22,
      failed: 2,
      skipped: 0,
      startedAt: 'May 18, 2024 10:30 AM',
      duration: '2m 45s',
      triggeredBy: 'Admin',
    },
    {
      id: 'EXE-127',
      suiteName: 'Payment Processing Suite',
      environment: 'TEST',
      status: 'failed',
      totalTests: 42,
      passed: 30,
      failed: 12,
      skipped: 0,
      startedAt: 'May 18, 2024 09:15 AM',
      duration: '5m 12s',
      triggeredBy: 'Admin',
    },
    {
      id: 'EXE-126',
      suiteName: 'Account Management Suite',
      environment: 'DEV',
      status: 'passed',
      totalTests: 36,
      passed: 36,
      failed: 0,
      skipped: 0,
      startedAt: 'May 18, 2024 08:40 AM',
      duration: '3m 22s',
      triggeredBy: 'Scheduler',
    },
    {
      id: 'EXE-125',
      suiteName: 'Regression Suite - v2.3',
      environment: 'STAGE',
      status: 'running',
      totalTests: 112,
      passed: 78,
      failed: 0,
      skipped: 0,
      startedAt: 'May 18, 2024 07:30 PM',
      duration: 'Running',
      triggeredBy: 'Admin',
    },
    {
      id: 'EXE-124',
      suiteName: 'Fund Transfer Suite',
      environment: 'TEST',
      status: 'failed',
      totalTests: 28,
      passed: 18,
      failed: 10,
      skipped: 0,
      startedAt: 'May 18, 2024 05:20 PM',
      duration: '4m 05s',
      triggeredBy: 'Admin',
    },
    {
      id: 'EXE-123',
      suiteName: 'Smoke Test Suite',
      environment: 'PROD',
      status: 'passed',
      totalTests: 16,
      passed: 16,
      failed: 0,
      skipped: 0,
      startedAt: 'May 18, 2024 03:10 PM',
      duration: '1m 18s',
      triggeredBy: 'Scheduler',
    },
    {
      id: 'EXE-122',
      suiteName: 'User Authentication Suite',
      environment: 'PROD',
      status: 'blocked',
      totalTests: 24,
      passed: 0,
      failed: 0,
      skipped: 24,
      startedAt: 'May 18, 2024 02:00 PM',
      duration: '0m 00s',
      triggeredBy: 'Admin',
    },
    {
      id: 'EXE-121',
      suiteName: 'Payment Processing Suite',
      environment: 'DEV',
      status: 'passed',
      totalTests: 42,
      passed: 41,
      failed: 1,
      skipped: 0,
      startedAt: 'May 18, 2024 11:30 AM',
      duration: '4m 55s',
      triggeredBy: 'Admin',
    },
  ];

  const executionDetails: ExecutionDetails = {
    id: 'EXE-128',
    suiteName: 'User Authentication Suite',
    environment: 'DEV (https://dev.api.company.com)',
    startedAt: 'May 18, 2024 10:30 AM',
    triggeredBy: 'Admin',
    totalTests: 24,
    passed: 22,
    failed: 2,
    skipped: 0,
  };

  React.useEffect(() => {
    if (executions.length > 0 && !selectedExecution) {
      setSelectedExecution(executionDetails);
    }
  }, []);

  const filteredExecutions = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return executions.filter((execution) => {
      const matchesSearch =
        !term ||
        execution.id.toLowerCase().includes(term) ||
        execution.suiteName.toLowerCase().includes(term) ||
        execution.environment.toLowerCase().includes(term);
      const matchesFilter = filter === 'all' || execution.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, executions]);

  const getStatusBadge = (status: TestExecution['status']) => {
    const variants: Record<TestExecution['status'], 'success' | 'destructive' | 'warning' | 'secondary'> = {
      'passed': 'success',
      'failed': 'destructive',
      'running': 'warning',
      'blocked': 'secondary',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getStatusIcon = (status: TestExecution['status']) => {
    switch (status) {
      case 'running':
        return <Play className='h-4 w-4 text-blue-600 animate-pulse' />;
      case 'passed':
        return <CheckCircle className='h-4 w-4 text-green-600' />;
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-600' />;
      case 'blocked':
        return <AlertCircle className='h-4 w-4 text-gray-600' />;
    }
  };

  const totalPassed = executions.filter(e => e.status === 'passed').length;
  const totalFailed = executions.filter(e => e.status === 'failed').length;
  const totalRunning = executions.filter(e => e.status === 'running').length;
  const totalBlocked = executions.filter(e => e.status === 'blocked').length;

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Executions</h1>
          <p className='mt-1 text-sm text-text-secondary'>View and monitor all test suite executions.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline'>
            <Clock className='mr-2 h-4 w-4' />
            Schedule Execution
          </Button>
          <Button>
            <Play className='mr-2 h-4 w-4' />
            Start Execution
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-5'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Total Executions</p>
                <p className='text-2xl font-bold text-text'>128</p>
                <p className='text-xs text-text-secondary mt-1'>+18 this week</p>
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
                <p className='text-2xl font-bold text-text'>94</p>
                <p className='text-xs text-text-secondary mt-1'>73.4%</p>
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
                <p className='text-2xl font-bold text-text'>26</p>
                <p className='text-xs text-text-secondary mt-1'>20.3%</p>
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
                <p className='text-2xl font-bold text-text'>8</p>
                <p className='text-xs text-text-secondary mt-1'>6.3%</p>
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
                <p className='text-sm font-medium text-text-secondary'>Blocked</p>
                <p className='text-2xl font-bold text-text'>0</p>
                <p className='text-xs text-text-secondary mt-1'>0.0%</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center'>
                <Square className='h-6 w-6 text-gray-600' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search executions...' className='sm:w-80' />
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>All Status</option>
            <option>Passed</option>
            <option>Failed</option>
            <option>Running</option>
            <option>Blocked</option>
          </select>
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>All Suites</option>
            <option>Authentication Suite</option>
            <option>Payment Suite</option>
          </select>
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>All Environments</option>
            <option>DEV</option>
            <option>TEST</option>
            <option>STAGE</option>
            <option>PROD</option>
          </select>
          <input 
            type='text' 
            placeholder='Date Range' 
            className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'
          />
          <Button variant='outline' size='sm'>
            <ChevronDown className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Executions Table */}
        <Card className='lg:col-span-2'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-border'>
                  <tr className='text-left text-xs text-text-secondary'>
                    <th className='px-4 py-3 font-medium'>Execution ID</th>
                    <th className='px-4 py-3 font-medium'>Suite Name</th>
                    <th className='px-4 py-3 font-medium'>Environment</th>
                    <th className='px-4 py-3 font-medium'>Status</th>
                    <th className='px-4 py-3 font-medium'>Total Tests</th>
                    <th className='px-4 py-3 font-medium'>Passed</th>
                    <th className='px-4 py-3 font-medium'>Failed</th>
                    <th className='px-4 py-3 font-medium'>Started At</th>
                    <th className='px-4 py-3 font-medium'>Duration</th>
                    <th className='px-4 py-3 font-medium'>Triggered By</th>
                    <th className='px-4 py-3 font-medium'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredExecutions.map((execution) => (
                    <tr 
                      key={execution.id} 
                      className={`hover:bg-surface transition-colors cursor-pointer ${
                        selectedExecution?.id === execution.id ? 'bg-surface' : ''
                      }`}
                      onClick={() => setSelectedExecution({
                        id: execution.id,
                        suiteName: execution.suiteName,
                        environment: execution.environment,
                        startedAt: execution.startedAt,
                        triggeredBy: execution.triggeredBy,
                        totalTests: execution.totalTests,
                        passed: execution.passed,
                        failed: execution.failed,
                        skipped: execution.skipped,
                      })}
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          {getStatusIcon(execution.status)}
                          <span className='text-xs font-mono text-text'>{execution.id}</span>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-text'>{execution.suiteName}</td>
                      <td className='px-4 py-3'>
                        <Badge variant='outline' className='text-xs'>{execution.environment}</Badge>
                      </td>
                      <td className='px-4 py-3'>{getStatusBadge(execution.status)}</td>
                      <td className='px-4 py-3 text-sm text-text'>{execution.totalTests}</td>
                      <td className='px-4 py-3 text-sm text-green-600'>{execution.passed}</td>
                      <td className='px-4 py-3 text-sm text-red-600'>{execution.failed}</td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>{execution.startedAt}</td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>{execution.duration}</td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>{execution.triggeredBy}</td>
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
          </CardContent>
        </Card>

        {/* Right Panel - Execution Details */}
        {selectedExecution && (
          <Card className='lg:col-span-1'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Execution Details</CardTitle>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <Copy className='h-4 w-4' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Execution ID */}
              <div>
                <h3 className='text-lg font-semibold text-text flex items-center gap-2'>
                  {selectedExecution.id}
                  {getStatusIcon(selectedExecution.id === 'EXE-125' ? 'running' : selectedExecution.id === 'EXE-128' ? 'passed' : 'failed')}
                </h3>
              </div>

              {/* Execution Info */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Suite Name</span>
                  <span className='font-medium text-text'>{selectedExecution.suiteName}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Environment</span>
                  <span className='font-medium text-text'>{selectedExecution.environment}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Started At</span>
                  <span className='font-medium text-text'>{selectedExecution.startedAt}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Triggered By</span>
                  <span className='font-medium text-text'>{selectedExecution.triggeredBy}</span>
                </div>
              </div>

              {/* Stats */}
              <div className='space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Total Tests</span>
                  <span className='font-medium text-text'>{selectedExecution.totalTests}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Passed</span>
                  <span className='font-medium text-green-600'>{selectedExecution.passed}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Failed</span>
                  <span className='font-medium text-red-600'>{selectedExecution.failed}</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>Skipped</span>
                  <span className='font-medium text-text'>{selectedExecution.skipped}</span>
                </div>
              </div>

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
                        strokeDasharray={`${(selectedExecution.passed / selectedExecution.totalTests) * 251.2} 251.2`}
                        className='text-green-600'
                      />
                    </svg>
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-text'>{Math.round((selectedExecution.passed / selectedExecution.totalTests) * 100)}%</div>
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

      {/* Pagination */}
      <div className='mt-4 flex items-center justify-between'>
        <span className='text-sm text-text-secondary'>Showing 1 to 8 of 128 executions</span>
        <div className='flex gap-1'>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0' disabled>‹</Button>
          <Button variant='default' size='sm' className='h-8 w-8 p-0'>1</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>2</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>3</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>4</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>›</Button>
        </div>
      </div>
    </div>
  );
};

export default ExecutionPage;