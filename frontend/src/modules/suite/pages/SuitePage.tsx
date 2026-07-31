// External libraries
import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FlaskConical, Plus, Play, GitBranch, Clock, CheckCircle, AlertTriangle, MoreVertical, ChevronDown } from 'lucide-react';

// Styles

export interface SuitePageProps {}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tags: string[];
  status: 'Active' | 'Paused' | 'Failed';
  lastUpdated: string;
  testCases: number;
  successRate: number;
}

interface SuiteDetails {
  name: string;
  description: string;
  suiteId: string;
  category: string;
  tags: string[];
  testCases: number;
  lastExecution: string;
  successRate: number;
  recentExecutions: Array<{
    id: string;
    status: 'passed' | 'failed';
    name: string;
    time: string;
  }>;
}

export const SuitePage: React.FC<SuitePageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('all');
  const [selectedSuite, setSelectedSuite] = React.useState<SuiteDetails | null>(null);

  const testSuites: TestSuite[] = [
    {
      id: '1',
      name: 'Authentication Tests',
      description: 'Tests for user authentication and authorization',
      tags: ['Auth', 'Security'],
      status: 'Active',
      lastUpdated: '2 hours ago',
      testCases: 12,
      successRate: 100,
    },
    {
      id: '2',
      name: 'Payment Gateway Tests',
      description: 'Payment processing API tests',
      tags: ['Payments', 'Critical'],
      status: 'Active',
      lastUpdated: '1 day ago',
      testCases: 45,
      successRate: 94,
    },
    {
      id: '3',
      name: 'User Management Tests',
      description: 'User service validation tests',
      tags: ['Users', 'Core'],
      status: 'Active',
      lastUpdated: '3 days ago',
      testCases: 28,
      successRate: 89,
    },
    {
      id: '4',
      name: 'Fraud Detection Tests',
      description: 'Fraud detection service tests',
      tags: ['Security', 'AI'],
      status: 'Active',
      lastUpdated: '5 days ago',
      testCases: 36,
      successRate: 92,
    },
    {
      id: '5',
      name: 'Account Service Tests',
      description: 'Account management tests',
      tags: ['Accounts', 'Core'],
      status: 'Active',
      lastUpdated: '1 week ago',
      testCases: 24,
      successRate: 96,
    },
    {
      id: '6',
      name: 'Notification Tests',
      description: 'Notification service tests',
      tags: ['Messaging', 'Events'],
      status: 'Paused',
      lastUpdated: '1 week ago',
      testCases: 18,
      successRate: 85,
    },
    {
      id: '7',
      name: 'Export Import Tests',
      description: 'Data export and import tests',
      tags: ['Data', 'Integration'],
      status: 'Active',
      lastUpdated: '2 weeks ago',
      testCases: 32,
      successRate: 91,
    },
    {
      id: '8',
      name: 'Security Compliance Tests',
      description: 'Security and compliance tests',
      tags: ['Security', 'Compliance'],
      status: 'Failed',
      lastUpdated: '2 weeks ago',
      testCases: 56,
      successRate: 78,
    },
  ];

  const suiteDetails: SuiteDetails = {
    name: 'Authentication Tests',
    description: 'Tests for user authentication and authorization',
    suiteId: 'auth-suite',
    category: 'Security',
    tags: ['Auth', 'Security'],
    testCases: 12,
    lastExecution: '2 hours ago',
    successRate: 100,
    recentExecutions: [
      { id: '1', status: 'passed', name: 'Run #24 - Passed', time: '2 hours ago' },
      { id: '2', status: 'passed', name: 'Run #23 - Passed', time: '1 day ago' },
      { id: '3', status: 'passed', name: 'Run #22 - Passed', time: '3 days ago' },
    ],
  };

  React.useEffect(() => {
    if (testSuites.length > 0 && !selectedSuite) {
      setSelectedSuite(suiteDetails);
    }
  }, []);

  const filteredSuites = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return testSuites.filter((suite) => {
      const matchesSearch =
        !term ||
        suite.name.toLowerCase().includes(term) ||
        suite.description.toLowerCase().includes(term) ||
        suite.tags.some(tag => tag.toLowerCase().includes(term));
      const matchesFilter = filter === 'all' || suite.status.toLowerCase() === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, testSuites]);

  const getStatusBadge = (status: TestSuite['status']) => {
    const variants: Record<TestSuite['status'], 'success' | 'warning' | 'destructive'> = {
      'Active': 'success',
      'Paused': 'warning',
      'Failed': 'destructive',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-text-secondary';
    }
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Test Suites</h1>
          <p className='mt-1 text-sm text-text-secondary'>Organize and manage your API test suites for service validation and regression testing.</p>
        </div>
        <div className='flex items-center gap-3'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search test suites...' className='sm:w-80' />
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            Create Suite
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4'>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Total Suites</p>
                <p className='text-2xl font-bold text-text'>8</p>
                <p className='text-xs text-text-secondary mt-1'>+2 this week</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center'>
                <FlaskConical className='h-6 w-6 text-purple-600' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Passed Suites</p>
                <p className='text-2xl font-bold text-text'>6</p>
                <p className='text-xs text-text-secondary mt-1'>75% success rate</p>
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
                <p className='text-sm font-medium text-text-secondary'>Failed Suites</p>
                <p className='text-2xl font-bold text-text'>1</p>
                <p className='text-xs text-text-secondary mt-1'>12% failure rate</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center'>
                <AlertTriangle className='h-6 w-6 text-yellow-600' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-text-secondary'>Total Executions</p>
                <p className='text-2xl font-bold text-text'>24</p>
                <p className='text-xs text-text-secondary mt-1'>+5 this week</p>
              </div>
              <div className='h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center'>
                <Clock className='h-6 w-6 text-blue-600' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-text-secondary'>Filter:</span>
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'
          >
            <option value='all'>All Status</option>
            <option value='active'>Active</option>
            <option value='paused'>Paused</option>
            <option value='failed'>Failed</option>
          </select>
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>All Tags</option>
            <option>Auth</option>
            <option>Security</option>
            <option>Payments</option>
          </select>
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-text-secondary'>Sort:</span>
          <select className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'>
            <option>Updated</option>
            <option>Name</option>
            <option>Status</option>
          </select>
          <Button variant='outline' size='sm'>
            <ChevronDown className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Test Suites List */}
        <Card className='lg:col-span-2'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='border-b border-border'>
                  <tr className='text-left text-sm text-text-secondary'>
                    <th className='px-4 py-3 font-medium'>Suite Name</th>
                    <th className='px-4 py-3 font-medium'>Description</th>
                    <th className='px-4 py-3 font-medium'>Tags</th>
                    <th className='px-4 py-3 font-medium'>Status</th>
                    <th className='px-4 py-3 font-medium'>Last Updated</th>
                    <th className='px-4 py-3 font-medium'></th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {filteredSuites.map((suite) => (
                    <tr 
                      key={suite.id} 
                      className={`hover:bg-surface transition-colors cursor-pointer ${
                        selectedSuite?.suiteId === suite.id ? 'bg-surface' : ''
                      }`}
                      onClick={() => setSelectedSuite({
                        name: suite.name,
                        description: suite.description,
                        suiteId: suite.id,
                        category: 'General',
                        tags: suite.tags,
                        testCases: suite.testCases,
                        lastExecution: suite.lastUpdated,
                        successRate: suite.successRate,
                        recentExecutions: [],
                      })}
                    >
                      <td className='px-4 py-4'>
                        <div className='flex items-center gap-3'>
                          <div className='h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center'>
                            <FlaskConical className='h-4 w-4 text-purple-600' />
                          </div>
                          <div className='font-medium text-text'>{suite.name}</div>
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        <div className='text-sm text-text-secondary line-clamp-1'>{suite.description}</div>
                      </td>
                      <td className='px-4 py-4'>
                        <div className='flex gap-1'>
                          {suite.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant='outline' className='text-xs'>{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className='px-4 py-4'>{getStatusBadge(suite.status)}</td>
                      <td className='px-4 py-4 text-sm text-text-secondary'>{suite.lastUpdated}</td>
                      <td className='px-4 py-4'>
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

        {/* Right Panel - Suite Details */}
        {selectedSuite && (
          <Card className='lg:col-span-1'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Suite Details</CardTitle>
                {getStatusBadge('Active')}
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Suite Info */}
              <div>
                <h3 className='text-lg font-semibold text-text'>{selectedSuite.name}</h3>
                <p className='text-sm text-text-secondary mt-1'>{selectedSuite.description}</p>
              </div>

              {/* Key Information */}
              <div>
                <h4 className='text-sm font-semibold text-text mb-3'>Key Information</h4>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Suite ID</span>
                    <span className='font-medium text-text'>{selectedSuite.suiteId}</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Category</span>
                    <span className='font-medium text-text'>{selectedSuite.category}</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Tags</span>
                    <div className='flex gap-1'>
                      {selectedSuite.tags.map((tag) => (
                        <Badge key={tag} variant='outline' className='text-xs'>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h4 className='text-sm font-semibold text-text mb-3'>Stats</h4>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Test Cases</span>
                    <span className='font-medium text-text'>{selectedSuite.testCases}</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Last Execution</span>
                    <span className='font-medium text-text'>{selectedSuite.lastExecution}</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Success Rate</span>
                    <span className='font-medium text-green-600'>{selectedSuite.successRate}%</span>
                  </div>
                </div>
              </div>

              {/* Recent Executions */}
              <div>
                <h4 className='text-sm font-semibold text-text mb-3'>Recent Executions</h4>
                <div className='space-y-2'>
                  {selectedSuite.recentExecutions.map((exec) => (
                    <div key={exec.id} className='flex items-center justify-between text-sm'>
                      <div className='flex items-center gap-2'>
                        <CheckCircle className={`h-4 w-4 ${getStatusColor(exec.status)}`} />
                        <span className='text-text'>{exec.name}</span>
                      </div>
                      <span className='text-text-secondary'>{exec.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Run Suite Button */}
              <Button className='w-full'>
                <Play className='mr-2 h-4 w-4' />
                Run Suite
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SuitePage;