// External libraries
import React from 'react';

// Shared constants

// Shared types
import { logger } from '../../../utils/logger';

// Hooks
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Services
import { projectService } from '../../../services/ProjectService';

// Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Activity, FolderOpen, FlaskConical, BarChart3, Upload, Play, Globe, FileText } from 'lucide-react';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { EmptyState } from '../../../components/ui/EmptyState';

// Styles
import { queryKeys } from '../../../constants';

export interface DashboardPageProps {}

interface SummaryCard {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'test' | 'suite' | 'report' | 'project';
  status: 'success' | 'failed' | 'running' | 'pending';
}

export const DashboardPage: React.FC<DashboardPageProps> = () => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.projectDashboard('1');

  const { data: dashboardData, isLoading, isError, error, refetch } = useQuery<{
    summaryCards: SummaryCard[];
    recentActivity: ActivityItem[];
  }>({
    queryKey,
    queryFn: async () => {
      // TODO: Replace with real API call when dashboard endpoint is available
      // const data = await projectService.getDashboardData(projectId);
      // return data;
      return {
        summaryCards: [],
        recentActivity: [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const summaryCards: SummaryCard[] = dashboardData?.summaryCards || [];
  const recentActivity: ActivityItem[] = dashboardData?.recentActivity || [];

  const quickActions = [
    {
      title: 'Import API Contract',
      description: 'Import OpenAPI, Postman, GraphQL or HAR',
      icon: <Upload className='h-6 w-6' />,
      onClick: () => logger.info('Quick action: Import API Contract'),
    },
    {
      title: 'Create Project',
      description: 'Create a new project workspace',
      icon: <FolderOpen className='h-6 w-6' />,
      onClick: () => logger.info('Quick action: Create Project'),
    },
    {
      title: 'Create Environment',
      description: 'Add a new environment for testing',
      icon: <Globe className='h-6 w-6' />,
      onClick: () => logger.info('Quick action: Create Environment'),
    },
    {
      title: 'Start Execution',
      description: 'Execute tests for a test suite',
      icon: <Play className='h-6 w-6' />,
      onClick: () => logger.info('Quick action: Start Execution'),
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

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-text'>Dashboard</h1>
          <p className='mt-1 text-sm text-text-secondary'>Loading...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold text-text'>Dashboard</h1>
        </div>
        <ErrorAlert
          title='Failed to load dashboard data'
          message={error?.message || 'An unexpected error occurred while loading dashboard data.'}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Dashboard</h1>
          <p className='mt-1 text-sm text-text-secondary'>Overview of your API validation workspace</p>
        </div>
        <Button variant='outline'>
          <Activity className='mr-2 h-4 w-4' />
          View All Activity
        </Button>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {summaryCards.length === 0 ? (
          <Card className='col-span-full'>
            <CardContent className='pt-6'>
              <EmptyState
                title='No summary data yet'
                description='Run your first execution to see performance metrics here.'
              />
            </CardContent>
          </Card>
        ) : (
          summaryCards.map((card, index) => (
            <Card key={index}>
              <CardContent className='pt-6'>
                <div className='text-sm font-medium text-text-secondary'>{card.title}</div>
                <div className='mt-2 flex items-baseline gap-2'>
                  <div className='text-3xl font-bold text-text'>{card.value}</div>
                </div>
                <p className='mt-1 text-xs text-text-secondary'>{card.change}</p>
              </CardContent>
            </Card>
          ))
        )}
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
            {recentActivity.length === 0 ? (
              <EmptyState
                title='No recent activity'
                description='Start executing tests to see activity here.'
              />
            ) : (
              <div className='space-y-4'>
                {recentActivity.map((activity) => (
                  <div key={activity.id} className='flex items-start gap-4'>
                    <div className='flex-shrink-0'>
                      {activity.type === 'test' && <FlaskConical className='h-5 w-5 text-blue-600' />}
                      {activity.type === 'suite' && <FolderOpen className='h-5 w-5 text-purple-600' />}
                      {activity.type === 'report' && <BarChart3 className='h-5 w-5 text-green-600' />}
                      {activity.type === 'project' && <FolderOpen className='h-5 w-5 text-orange-600' />}
                    </div>
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
            )}
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
    </div>
  );
};

export default DashboardPage;