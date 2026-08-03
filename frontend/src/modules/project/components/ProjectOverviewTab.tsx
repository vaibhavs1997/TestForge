import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface ProjectOverviewTabProps {
  projectId?: string;
  projectName?: string;
}

interface ReadinessCardProps {
  title: string;
  value: string;
  status: 'ready' | 'partial' | 'missing';
  actionLabel?: string;
  onAction?: () => void;
}

const ReadinessCard: React.FC<ReadinessCardProps> = ({ title, value, status, actionLabel, onAction }) => {
  const statusColor = {
    ready: 'bg-green-500',
    partial: 'bg-yellow-500',
    missing: 'bg-red-500',
  }[status];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${statusColor}`} />
          <span className="text-2xl font-bold">{value}</span>
        </div>
        {actionLabel && onAction && (
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({ projectId, projectName }) => {
  const navigate = useNavigate();
  const [pipelineStatus, setPipelineStatus] = React.useState<'running' | 'completed' | 'pending' | 'failed'>('pending');

  React.useEffect(() => {
    const loadPipelineStatus = async () => {
      if (!projectId) return;
      try {
        const response = await fetch(`/api/projects/${projectId}/pipelines`);
        if (response.ok) {
          const pipelines = await response.json();
          const latest = pipelines[0];
          if (latest) {
            setPipelineStatus(latest.status as 'running' | 'completed' | 'pending' | 'failed');
          }
        }
      } catch {
        setPipelineStatus('pending');
      }
    };
    loadPipelineStatus();
  }, [projectId]);

  const handleRunPipeline = () => {
    if (!projectId) return;
    navigate(`/projects/${projectId}/requirements`);
  };

  const handleRunExecution = () => {
    if (!projectId) return;
    navigate(`/projects/${projectId}/execution`);
  };

  const handleViewReports = () => {
    if (!projectId) return;
    navigate(`/projects/${projectId}/reports`);
  };

  const readinessItems = [
    { title: 'APIs Imported', value: '5', status: 'ready' as const },
    { title: 'Environment', value: '2', status: 'ready' as const },
    { title: 'Datasets', value: '3', status: 'partial' as const },
    { title: 'Knowledge', value: '4', status: 'ready' as const },
    { title: 'Requirements', value: '0', status: 'missing' as const },
    { title: 'Execution Plans', value: '0', status: 'missing' as const },
    { title: 'Recommendations', value: '3', status: 'ready' as const },
    { title: 'Coverage', value: '0%', status: 'missing' as const },
    { title: 'Pipeline Status', value: pipelineStatus.toUpperCase(), status: 'ready' as const },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">{projectName || 'Project'} - Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {readinessItems.map((item) => (
          <ReadinessCard
            key={item.title}
            title={item.title}
            value={item.value}
            status={item.status}
          />
        ))}
      </div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Actions</h3>
        <div className="flex gap-3">
          <Button variant="default" onClick={handleRunPipeline}>
            Continue Pipeline
          </Button>
          <Button variant="outline" onClick={handleRunExecution}>
            Run Execution
          </Button>
          <Button variant="outline" onClick={handleViewReports}>
            View Reports
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverviewTab;