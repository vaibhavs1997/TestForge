import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useServices, useApiOperations } from '../../api/hooks';
import { useEnvironments } from '../../environment/hooks/useEnvironments';
import { useRequirements } from '../../requirements/hooks';
import { useExecution } from '../../execution/hooks';
import { useReports } from '../../report/hooks';
import {
  FolderOpen,
  Globe,
  ListChecks,
  Play,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Workflow,
} from 'lucide-react';

interface PipelineDashboardProps {
  projectId: string;
  projectName?: string;
}

type StepKey = 'apis' | 'environment' | 'requirements' | 'execution' | 'reports';

interface GoldenStep {
  key: StepKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  detail: string;
  path: string;
  actionLabel: string;
}

const formatAgo = (timestamp: number | null | undefined): string => {
  if (!timestamp) return '—';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({ projectId, projectName }) => {
  const navigate = useNavigate();
  const [showFullPipeline, setShowFullPipeline] = React.useState(false);

  const { services } = useServices(projectId);
  const serviceIds = React.useMemo(() => services.map((s) => s.id), [services]);
  const { operations } = useApiOperations(projectId, serviceIds);
  const { environments } = useEnvironments(projectId);
  const { requirements, suggested, approved } = useRequirements(projectId);
  const { runs } = useExecution(projectId);
  const { reports } = useReports(projectId);

  const opCount = operations?.length ?? 0;
  const hasApis = services.length > 0 && opCount > 0;
  const hasEnv = environments.length > 0;
  const hasRequirements = requirements.length > 0;
  const hasRuns = runs.length > 0;
  const hasReports = reports.length > 0;

  const latestRun = runs.length > 0 ? [...runs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] : null;
  const latestReport = reports.length > 0 ? [...reports].sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))[0] : null;

  const steps: GoldenStep[] = React.useMemo(
    () => [
      {
        key: 'apis',
        label: 'Import API contract',
        description: 'OpenAPI, Postman, or Swagger — we map tests to your endpoints.',
        icon: FolderOpen,
        done: hasApis,
        detail: hasApis ? `${services.length} service(s), ${opCount} operation(s)` : 'No API imported yet',
        path: `/projects/${projectId}/apis`,
        actionLabel: hasApis ? 'Manage APIs' : 'Import APIs',
      },
      {
        key: 'environment',
        label: 'Set target environment',
        description: 'Base URL and variables used when you run tests.',
        icon: Globe,
        done: hasEnv,
        detail: hasEnv ? `${environments.length} environment(s)` : 'No environment configured',
        path: `/projects/${projectId}/environment`,
        actionLabel: hasEnv ? 'Manage environment' : 'Add environment',
      },
      {
        key: 'requirements',
        label: 'Capture requirements & test cases',
        description: 'Paste acceptance criteria, import from Jira, generate and curate cases.',
        icon: ListChecks,
        done: hasRequirements,
        detail: hasRequirements
          ? `${requirements.length} requirement(s) · ${suggested.length} suggested`
          : 'No requirements yet',
        path: `/projects/${projectId}/requirements`,
        actionLabel: hasRequirements ? 'Open requirements' : 'Add requirement',
      },
      {
        key: 'execution',
        label: 'Run tests',
        description: 'Execute ready plans from your requirements.',
        icon: Play,
        done: hasRuns,
        detail: latestRun
          ? `Last run ${latestRun.status} · ${formatAgo(latestRun.updatedAt)}`
          : 'No runs yet',
        path: `/projects/${projectId}/execution`,
        actionLabel: hasRuns ? 'View runs' : 'Run tests',
      },
      {
        key: 'reports',
        label: 'Review report',
        description: 'Share results — export or post to Jira when linked.',
        icon: BarChart3,
        done: hasReports,
        detail: latestReport
          ? `${latestReport.overallStatus} · ${formatAgo(latestReport.generatedAt)}`
          : 'No reports yet',
        path: latestReport
          ? `/projects/${projectId}/reports/${latestReport.id}`
          : `/projects/${projectId}/reports`,
        actionLabel: hasReports ? 'Open latest report' : 'View reports',
      },
    ],
    [
      projectId,
      hasApis,
      services.length,
      opCount,
      hasEnv,
      environments.length,
      hasRequirements,
      requirements.length,
      suggested.length,
      hasRuns,
      hasReports,
      latestRun,
      latestReport,
    ],
  );

  const nextStep = React.useMemo(() => steps.find((s) => !s.done) ?? steps[steps.length - 1], [steps]);
  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">{projectName || 'Project'}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Follow the steps below to go from API contract to test report.
        </p>
      </div>

      <Card className="mb-8 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Suggested next step</p>
            <p className="mt-1 text-lg font-semibold text-text">{nextStep.label}</p>
            <p className="text-sm text-text-secondary">{nextStep.description}</p>
          </div>
          <Button onClick={() => navigate(nextStep.path)} className="shrink-0">
            {nextStep.actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-text">Progress</span>
        <span className="text-sm text-text-secondary">
          {completedCount} of {steps.length} · {progressPercent}%
        </span>
      </div>
      <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card
              key={step.key}
              className={`transition-colors ${step.key === nextStep.key && !step.done ? 'border-primary/40' : ''}`}
            >
              <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface">
                    {step.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-text-secondary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-secondary">Step {index + 1}</span>
                      <Icon className="h-4 w-4 text-text-secondary" />
                    </div>
                    <p className="font-semibold text-text">{step.label}</p>
                    <p className="text-sm text-text-secondary">{step.detail}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(step.path)}>
                  {step.actionLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left"
            onClick={() => setShowFullPipeline((v) => !v)}
          >
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-4 w-4" />
              Full pipeline &amp; administration
            </CardTitle>
            {showFullPipeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {showFullPipeline && (
          <CardContent className="space-y-3 text-sm text-text-secondary">
            <p>
              Analysis, knowledge flows, suites, readiness, and strategy tools live in the sidebar under{' '}
              <strong className="text-text">Administration</strong> and inside{' '}
              <strong className="text-text">Requirements → More</strong> when you need them.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{approved.length} approved requirements</Badge>
              <Badge variant="outline">{runs.length} execution runs</Badge>
              <Badge variant="outline">{reports.length} reports</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${projectId}/pipeline`)}>
              Open pipeline view
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default PipelineDashboard;
