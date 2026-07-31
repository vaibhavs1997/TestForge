// External libraries
import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BarChart3, Download, Plus, Calendar, Play, FileText, CheckCircle, XCircle, AlertTriangle, Clock, ChevronDown, MoreVertical, Eye, Download as DownloadIcon, TrendingUp, TrendingDown } from 'lucide-react';

// Styles

export interface ReportPageProps {}

interface Report {
  id: string;
  name: string;
  suiteName: string;
  environment: string;
  executedAt: string;
  duration: string;
  status: 'passed' | 'failed' | 'running' | 'blocked';
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  successRate: number;
}

interface ExecutionSummary {
  totalExecutions: number;
  passed: number;
  failed: number;
  blocked: number;
  successRate: number;
}

interface TopFailingSuite {
  name: string;
  failed: number;
}

export const ReportPage: React.FC<ReportPageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');

  const reports: Report[] = [
    {
      id: 'RPT-001',
      name: 'User Authentication Report',
      suiteName: 'User Authentication Suite',
      environment: 'DEV',
      executedAt: 'May 18, 2024 10:30 AM',
      duration: '2m 45s',
      status: 'passed',
      totalTests: 24,
      passed: 22,
      failed: 2,
      skipped: 0,
      successRate: 91.7,
    },
    {
      id: 'RPT-002',
      name: 'Payment Processing Report',
      suiteName: 'Payment Processing Suite',
      environment: 'TEST',
      executedAt: 'May 18, 2024 09:15 AM',
      duration: '5m 12s',
      status: 'failed',
      totalTests: 42,
      passed: 30,
      failed: 12,
      skipped: 0,
      successRate: 71.4,
    },
    {
      id: 'RPT-003',
      name: 'Account Management Report',
      suiteName: 'Account Management Suite',
      environment: 'DEV',
      executedAt: 'May 18, 2024 08:40 AM',
      duration: '3m 22s',
      status: 'passed',
      totalTests: 36,
      passed: 36,
      failed: 0,
      skipped: 0,
      successRate: 100,
    },
    {
      id: 'RPT-004',
      name: 'Regression Suite Report',
      suiteName: 'Regression Suite - v2.3',
      environment: 'STAGE',
      executedAt: 'May 18, 2024 07:30 PM',
      duration: 'Running',
      status: 'running',
      totalTests: 112,
      passed: 78,
      failed: 0,
      skipped: 0,
      successRate: 69.6,
    },
    {
      id: 'RPT-005',
      name: 'Fund Transfer Report',
      suiteName: 'Fund Transfer Suite',
      environment: 'TEST',
      executedAt: 'May 18, 2024 05:20 PM',
      duration: '4m 05s',
      status: 'failed',
      totalTests: 28,
      passed: 18,
      failed: 10,
      skipped: 0,
      successRate: 64.3,
    },
    {
      id: 'RPT-006',
      name: 'Smoke Test Report',
      suiteName: 'Smoke Test Suite',
      environment: 'PROD',
      executedAt: 'May 18, 2024 03:10 PM',
      duration: '1m 18s',
      status: 'passed',
      totalTests: 16,
      passed: 16,
      failed: 0,
      skipped: 0,
      successRate: 100,
    },
  ];

  const executionSummary: ExecutionSummary = {
    totalExecutions: 86,
    passed: 94,
    failed: 26,
    blocked: 8,
    successRate: 94.2,
  };

  const topFailingSuites: TopFailingSuite[] = [
    { name: 'Payment Processing Suite', failed: 12 },
    { name: 'Fund Transfer Suite', failed: 10 },
    { name: 'Regression Suite - v2.3', failed: 8 },
  ];

  const filteredReports = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !term ||
        report.name.toLowerCase().includes(term) ||
        report.suiteName.toLowerCase().includes(term) ||
        report.environment.toLowerCase().includes(term);
      const matchesFilter = filter === 'all' || report.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, reports]);

  const getStatusBadge = (status: Report['status']) => {
    const variants: Record<Report['status'], 'success' | 'destructive' | 'warning' | 'secondary'> = {
      'passed': 'success',
      'failed': 'destructive',
      'running': 'warning',
      'blocked': 'secondary',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'running':
        return <Play className='h-4 w-4 text-blue-600 animate-pulse' />;
      case 'passed':
        return <CheckCircle className='h-4 w-4 text-green-600' />;
      case 'failed':
        return <XCircle className='h-4 w-4 text-red-600' />;
      case 'blocked':
        return <AlertTriangle className='h-4 w-4 text-gray-600' />;
    }
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Reports</h1>
          <p className='mt-1 text-sm text-text-secondary'>View detailed test execution reports and insights.</p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline'>
            <Download className='mr-2 h-4 w-4' />
            Export Report
          </Button>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-6'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Total Reports</p>
                <p className='text-2xl font-bold text-text'>86</p>
                <p className='text-xs text-text-secondary mt-1'>+12 this week</p>
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
                <p className='text-sm font-medium text-text-secondary'>Total Executions</p>
                <p className='text-2xl font-bold text-text'>128</p>
                <p className='text-xs text-text-secondary mt-1'>+16 this week</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center'>
                <Play className='h-6 w-6 text-purple-600' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Success Rate</p>
                <p className='text-2xl font-bold text-text'>94.2%</p>
                <p className='text-xs text-text-secondary mt-1'>+3.1% from last week</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center'>
                <TrendingUp className='h-6 w-6 text-green-600' />
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
                <p className='text-sm font-medium text-text-secondary'>Blocked</p>
                <p className='text-2xl font-bold text-text'>8</p>
                <p className='text-xs text-text-secondary mt-1'>6.3%</p>
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
        <div className='flex items-center gap-2'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search reports...' className='sm:w-80' />
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>All Environments</option>
            <option>DEV</option>
            <option>TEST</option>
            <option>STAGE</option>
            <option>PROD</option>
          </select>
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>All Suites</option>
            <option>Authentication Suite</option>
            <option>Payment Suite</option>
          </select>
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>All Statuses</option>
            <option>Passed</option>
            <option>Failed</option>
            <option>Running</option>
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
        {/* Left Panel - Reports Table */}
        <Card className='lg:col-span-2'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-border'>
                  <tr className='text-left text-xs text-text-secondary'>
                    <th className='px-4 py-3 font-medium'>Report Name</th>
                    <th className='px-4 py-3 font-medium'>Suite Name</th>
                    <th className='px-4 py-3 font-medium'>Environment</th>
                    <th className='px-4 py-3 font-medium'>Executed At</th>
                    <th className='px-4 py-3 font-medium'>Duration</th>
                    <th className='px-4 py-3 font-medium'>Status</th>
                    <th className='px-4 py-3 font-medium'>Total Tests</th>
                    <th className='px-4 py-3 font-medium'>Passed</th>
                    <th className='px-4 py-3 font-medium'>Failed</th>
                    <th className='px-4 py-3 font-medium'>Success Rate</th>
                    <th className='px-4 py-3 font-medium'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredReports.map((report) => (
                    <tr 
                      key={report.id} 
                      className='hover:bg-surface transition-colors cursor-pointer'
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-2'>
                          {getStatusIcon(report.status)}
                          <span className='text-sm font-medium text-text'>{report.name}</span>
                        </div>
                      </td>
                      <td className='px-4 py-3 text-sm text-text-secondary'>{report.suiteName}</td>
                      <td className='px-4 py-3'>
                        <Badge variant='outline' className='text-xs'>{report.environment}</Badge>
                      </td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>{report.executedAt}</td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>{report.duration}</td>
                      <td className='px-4 py-3'>{getStatusBadge(report.status)}</td>
                      <td className='px-4 py-3 text-sm text-text'>{report.totalTests}</td>
                      <td className='px-4 py-3 text-sm text-green-600'>{report.passed}</td>
                      <td className='px-4 py-3 text-sm text-red-600'>{report.failed}</td>
                      <td className='px-4 py-3 text-xs text-text-secondary'>{report.successRate}%</td>
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

        {/* Right Panel - Execution Summary */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle className='text-base'>Execution Summary</CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            {/* Overall Summary */}
            <div className='flex items-center justify-center'>
              <div className='relative h-32 w-32'>
                <svg className='h-32 w-32 transform -rotate-90'>
                  <circle
                    cx='64'
                    cy='64'
                    r='56'
                    stroke='currentColor'
                    strokeWidth='12'
                    fill='none'
                    className='text-gray-200'
                  />
                  <circle
                    cx='64'
                    cy='64'
                    r='56'
                    stroke='currentColor'
                    strokeWidth='12'
                    fill='none'
                    strokeDasharray={`${(executionSummary.passed / executionSummary.totalExecutions) * 351.86} 351.86`}
                    className='text-green-600'
                  />
                </svg>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='text-center'>
                    <div className='text-3xl font-bold text-text'>{executionSummary.successRate}%</div>
                    <div className='text-xs text-text-secondary'>Success Rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Total Executions</span>
                <span className='font-medium text-text'>{executionSummary.totalExecutions}</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Passed</span>
                <span className='font-medium text-green-600'>{executionSummary.passed} (73.4%)</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Failed</span>
                <span className='font-medium text-red-600'>{executionSummary.failed} (20.3%)</span>
              </div>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-text-secondary'>Blocked</span>
                <span className='font-medium text-yellow-600'>{executionSummary.blocked} (6.3%)</span>
              </div>
            </div>

            {/* Trend Chart */}
            <div>
              <h4 className='text-sm font-semibold text-text mb-3'>Trend (Last 7 Days)</h4>
              <div className='h-32 flex items-end justify-between gap-1'>
                {[65, 75, 50, 80, 60, 85, 70].map((value, index) => (
                  <div key={index} className='flex-1 flex flex-col items-center gap-1'>
                    <div className='w-full bg-green-500 rounded-t' style={{ height: `${value}%` }}></div>
                  </div>
                ))}
              </div>
              <div className='flex justify-between mt-1 text-xs text-text-secondary'>
                <span>May 12</span>
                <span>May 15</span>
                <span>May 18</span>
              </div>
            </div>

            {/* Top Failing Suites */}
            <div>
              <h4 className='text-sm font-semibold text-text mb-3'>Top Failing Suites</h4>
              <div className='space-y-2'>
                {topFailingSuites.map((suite, index) => (
                  <div key={index} className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary line-clamp-1'>{suite.name}</span>
                    <span className='font-medium text-red-600'>{suite.failed}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className='text-sm font-semibold text-text mb-3'>Quick Actions</h4>
              <div className='space-y-2'>
                <Button variant='outline' size='sm' className='w-full justify-start'>
                  <Eye className='mr-2 h-4 w-4' />
                  View Report
                </Button>
                <Button variant='outline' size='sm' className='w-full justify-start'>
                  <DownloadIcon className='mr-2 h-4 w-4' />
                  Download Report
                </Button>
                <Button variant='outline' size='sm' className='w-full justify-start'>
                  <Play className='mr-2 h-4 w-4' />
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      <div className='mt-4 flex items-center justify-between'>
        <span className='text-sm text-text-secondary'>Showing 1 to 6 of 86 reports</span>
        <div className='flex gap-1'>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0' disabled>‹</Button>
          <Button variant='default' size='sm' className='h-8 w-8 p-0'>1</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>2</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>3</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>...</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>15</Button>
          <Button variant='outline' size='sm' className='h-8 w-8 p-0'>›</Button>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;