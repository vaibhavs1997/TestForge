// External libraries
import React from 'react';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Activity, FlaskConical, FolderOpen, BarChart3, Upload, Play } from 'lucide-react';

// Styles

export interface ProjectDashboardPageProps {
  projectId?: string;
  projectName?: string;
}

interface DashboardStats {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  type: 'test' | 'suite' | 'report' | 'project';
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const ProjectDashboardPage: React.FC<ProjectDashboardPageProps> = ({ projectName = 'Banking API' }) => {
  const stats: DashboardStats[] = [
    {
      title: 'Total Projects',
      value: '12',
      change: '+2 this week',
      trend: 'up',
    },
    {
      title: 'API Services',
      value: '156',
      change: '+18 this week',
      trend: 'up',
    },
    {
      title: 'Test Suites',
      value: '48',
      change: '+6 this week',
      trend: 'up',
    },
    {
      title: 'Success Rate',
      value: '94.2%',
      change: '-1.3% from last week',
      trend: 'down',
    },
  ];

  const recentActivity: Activity[] = [
    {
      id: '1',
      title: 'User Authentication API Tests',
      description: 'Test suite executed successfully',
      timestamp: '2024-01-15T10:30:00Z',
      status: 'success',
      type: 'test',
    },
    {
      id: '2',
      title: 'Import: OpenAPI - User Service',
      description: 'Import completed successfully',
      timestamp: '2024-01-15T09:15:00Z',
      status: 'success',
      type: 'test',
    },
    {
      id: '3',
      title: 'Regression Suite - v2.3',
      description: 'Test suite is currently running',
      timestamp: '2024-01-15T08:45:00Z',
      status: 'running',
      type: 'suite',
    },
    {
      id: '4',
      title: 'Payment Service Tests',
      description: '3 tests failed',
      timestamp: '2024-01-15T07:20:00Z',
      status: 'failed',
      type: 'test',
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Import API Contract',
      description: 'Import OpenAPI, Postman, GraphQL or HAR',
      icon: <Upload className='h-6 w-6' />,
      onClick: () => console.log('Import clicked'),
    },
    {
      title: 'Create Environment',
      description: 'Add a new environment for testing',
      icon: <FolderOpen className='h-6 w-6' />,
      onClick: () => console.log('Create environment clicked'),
    },
    {
      title: 'Create Test Suite',
      description: 'Organize tests into executable suites',
      icon: <FlaskConical className='h-6 w-6' />,
      onClick: () => console.log('Create suite clicked'),
    },
    {
      title: 'Start Execution',
      description: 'Execute tests for a test suite',
      icon: <Play className='h-6 w-6' />,
      onClick: () => console.log('Start execution clicked'),
    },
  ];

  const recentExecutions = [
    {
      id: '1',
      name: 'User Authentication API Tests',
      status: 'success',
      time: '2 min ago',
    },
    {
      id: '2',
      name: 'Payment Service Integration',
      status: 'failed',
      time: '1 hour ago',
    },
    {
      id: '3',
      name: 'Regression Suite - v2.3',
      status: 'running',
      time: '32 min ago',
    },
    {
      id: '4',
      name: 'Performance Test - Q1',
      status: 'success',
      time: '2 hours ago',
    },
  ];

  const recentReports = [
    {
      id: '1',
      name: 'User Auth - Execution Report',
      date: '15 May 2024',
    },
    {
      id: '2',
      name: 'Payment Service - Report',
      date: '15 May 2024',
    },
    {
      id: '3',
      name: 'Regression Suite - Report',
      date: '14 May 2024',
    },
    {
      id: '4',
      name: 'Performance Test - Report',
      date: '14 May 2024',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
      success: 'success',
      failed: 'destructive',
      running: 'warning',
      pending: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'test':
        return <FlaskConical className='h-5 w-5 text-blue-600' />;
      case 'suite':
        return <FolderOpen className='h-5 w-5 text-purple-600' />;
      case 'report':
        return <BarChart3 className='h-5 w-5 text-green-600' />;
      case 'project':
        return <FolderOpen className='h-5 w-5 text-orange-600' />;
    }
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>{projectName} - Dashboard</h1>
          <p className='mt-1 text-sm text-text-secondary'>Overview of your API validation workspace</p>
        </div>
        <Button variant='outline'>
          <Activity className='mr-2 h-4 w-4' />
          View All Activity
        </Button>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className='pt-6'>
              <div className='text-sm font-medium text-text-secondary'>{stat.title}</div>
              <div className='mt-2 flex items-baseline gap-2'>
                <div className='text-3xl font-bold text-text'>{stat.value}</div>
              </div>
              <p className='mt-1 text-xs text-text-secondary'>{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className='mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Recent Activity */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Activity</CardTitle>
              <Button variant='ghost' size='sm'>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {recentActivity.map((activity) => (
                <div key={activity.id} className='flex items-start gap-4'>
                  <div className='flex-shrink-0'>{getActivityIcon(activity.type)}</div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <p className='text-sm font-medium text-text'>{activity.title}</p>
                        <p className='text-xs text-text-secondary'>{activity.description}</p>
                      </div>
                      {getStatusBadge(activity.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 gap-4'>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className='flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent/50'
                >
                  <div className='text-primary'>{action.icon}</div>
                  <div>
                    <p className='text-sm font-medium text-text'>{action.title}</p>
                    <p className='text-xs text-text-secondary'>{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Executions, Project Health, and Recent Reports */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Executions</CardTitle>
              <Button variant='ghost' size='sm'>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {recentExecutions.map((execution) => (
                <div key={execution.id} className='flex items-center justify-between'>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium text-text truncate'>{execution.name}</p>
                    <p className='text-xs text-text-secondary'>{execution.time}</p>
                  </div>
                  {getStatusBadge(execution.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Health */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Project Health</CardTitle>
              <Button variant='ghost' size='sm'>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col items-center'>
              <div className='relative h-32 w-32'>
                <svg className='h-32 w-32' viewBox='0 0 100 100'>
                  <circle
                    cx='50'
                    cy='50'
                    r='40'
                    fill='none'
                    stroke='#e5e7eb'
                    strokeWidth='12'
                  />
                  <circle
                    cx='50'
                    cy='50'
                    r='40'
                    fill='none'
                    stroke='#3b82f6'
                    strokeWidth='12'
                    strokeDasharray='251.2'
                    strokeDashoffset='62.8'
                    transform='rotate(-90 50 50)'
                  />
                </svg>
                <div className='absolute inset-0 flex items-center justify-center'>
                  <div className='text-center'>
                    <div className='text-2xl font-bold text-text'>12</div>
                    <div className='text-xs text-text-secondary'>Projects</div>
                  </div>
                </div>
              </div>
              <div className='mt-4 w-full space-y-2'>
                <div className='flex items-center justify-between text-sm'>
                  <div className='flex items-center gap-2'>
                    <div className='h-3 w-3 rounded-full bg-green-600' />
                    <span className='text-text-secondary'>Healthy</span>
                  </div>
                  <span className='font-medium text-text'>8 (66.7%)</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <div className='flex items-center gap-2'>
                    <div className='h-3 w-3 rounded-full bg-yellow-600' />
                    <span className='text-text-secondary'>Warning</span>
                  </div>
                  <span className='font-medium text-text'>2 (16.7%)</span>
                </div>
                <div className='flex items-center justify-between text-sm'>
                  <div className='flex items-center gap-2'>
                    <div className='h-3 w-3 rounded-full bg-red-600' />
                    <span className='text-text-secondary'>Critical</span>
                  </div>
                  <span className='font-medium text-text'>2 (16.7%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle>Recent Reports</CardTitle>
              <Button variant='ghost' size='sm'>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              {recentReports.map((report) => (
                <div key={report.id} className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <BarChart3 className='h-4 w-4 text-text-secondary' />
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-text truncate'>{report.name}</p>
                      <p className='text-xs text-text-secondary'>{report.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProjectDashboardPage;