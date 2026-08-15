// External libraries
import React from 'react';
import { useNavigate } from 'react-router-dom';

// Hooks
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Services
import { projectService } from '../../../services/ProjectService';
import { auditService } from '../../audit/services';
import type { AuditLog } from '../../audit/types';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Activity, FolderOpen, FlaskConical, BarChart3, Upload, Play, Globe } from 'lucide-react';
import { PageError, PageLoading } from '../../../components/shared/PageState';
import { EmptyState } from '../../../components/ui/EmptyState';

// Styles
import { queryKeys } from '../../../constants';
import { projectStore } from '../../../store/projectStore';

export interface DashboardPageProps {}

interface SummaryCard {
  title: string;
  value: string | number;
  change?: string;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'test' | 'suite' | 'report' | 'project';
  status: 'success' | 'failed' | 'running' | 'pending';
  projectId?: string;
}

function mapAuditToActivity(log: AuditLog): ActivityItem {
  const failed = log.action === 'DELETE' || log.metadata?.status === 'Failed';
  const running = log.action === 'EXECUTE' && log.metadata?.status === 'Running';
  let type: ActivityItem['type'] = 'project';
  if (log.module === 'Execution' || log.module === 'TestSuite') type = 'test';
  if (log.module === 'Report') type = 'report';

  const title =
    log.entityType === 'ApiContract'
      ? 'API contract imported'
      : `${log.module} ${log.action.toLowerCase()}`;

  return {
    id: log.id,
    title,
    description: `Project ${log.projectId} · ${log.entityType}`,
    timestamp: new Date(log.timestamp).toISOString(),
    type,
    status: failed ? 'failed' : running ? 'running' : 'success',
    projectId: log.projectId,
  };
}

export const DashboardPage: React.FC<DashboardPageProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const selectedProjectId = projectStore((s) => s.selectedProjectId);
  const queryKey = queryKeys.projectDashboard('global');

  const { data: dashboardData, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const projects = await projectService.listProjects();
      const auditChunks = await Promise.all(
        projects.slice(0, 8).map((p) =>
          auditService.getAuditLogs(p.id).catch(() => [] as AuditLog[]),
        ),
      );
      const allLogs = auditChunks.flat().sort((a, b) => b.timestamp - a.timestamp);
      const recentActivity = allLogs.slice(0, 12).map(mapAuditToActivity);

      const summaryCards: SummaryCard[] = [
        { title: 'Projects', value: projects.length, change: 'Workspaces in this instance' },
        {
          title: 'Recent events',
          value: allLogs.length > 0 ? Math.min(allLogs.length, 99) : '—',
          change: 'Audit entries (sampled)',
        },
      ];

      return { summaryCards, recentActivity, projects };
    },
    staleTime: 60_000,
  });

  const summaryCards = dashboardData?.summaryCards ?? [];
  const recentActivity = dashboardData?.recentActivity ?? [];
  const activeProjectId = selectedProjectId ?? dashboardData?.projects?.[0]?.id;

  const quickActions = [
    {
      title: 'Import API Contract',
      description: 'Open APIs in your project workspace',
      icon: <Upload className="h-6 w-6" />,
      onClick: () => {
        if (activeProjectId) navigate(`/projects/${activeProjectId}/apis`);
        else navigate('/projects');
      },
    },
    {
      title: 'Create Project',
      description: 'Manage project workspaces',
      icon: <FolderOpen className="h-6 w-6" />,
      onClick: () => navigate('/projects'),
    },
    {
      title: 'Create Environment',
      description: 'Configure base URLs',
      icon: <Globe className="h-6 w-6" />,
      onClick: () => {
        if (activeProjectId) navigate(`/projects/${activeProjectId}/environment`);
        else navigate('/projects');
      },
    },
    {
      title: 'Start Execution',
      description: 'Run tests for a suite',
      icon: <Play className="h-6 w-6" />,
      onClick: () => {
        if (activeProjectId) navigate(`/projects/${activeProjectId}/execution`);
        else navigate('/projects');
      },
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
    void queryClient.invalidateQueries({ queryKey });
    void refetch();
  };

  const auditTarget = activeProjectId ? `/projects/${activeProjectId}/audit` : '/projects';

  if (isLoading) return <PageLoading title="Loading dashboard..." message="Building your workspace overview." />;

  if (isError) {
    return (
      <PageError
        title="Failed to load dashboard data"
        message={error?.message || 'An unexpected error occurred while loading dashboard data.'}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">Overview of your API validation workspace</p>
        </div>
        <Button variant="outline" onClick={() => navigate(auditTarget)}>
          <Activity className="mr-2 h-4 w-4" />
          View audit log
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-text-secondary">{card.title}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-3xl font-bold text-text">{card.value}</div>
              </div>
              {card.change && <p className="mt-1 text-xs text-text-secondary">{card.change}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate(auditTarget)}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Import APIs or run executions to see audit events here."
              />
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {activity.type === 'test' && <FlaskConical className="h-5 w-5 text-blue-600" />}
                      {activity.type === 'suite' && <FolderOpen className="h-5 w-5 text-purple-600" />}
                      {activity.type === 'report' && <BarChart3 className="h-5 w-5 text-green-600" />}
                      {activity.type === 'project' && <FolderOpen className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text">{activity.title}</p>
                          <p className="text-xs text-text-secondary">{activity.description}</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={action.onClick}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="text-primary">{action.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-text">{action.title}</p>
                    <p className="text-xs text-text-secondary">{action.description}</p>
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
