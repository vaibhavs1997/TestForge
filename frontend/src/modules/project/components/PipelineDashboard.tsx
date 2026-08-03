import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useServices } from '../../api/hooks';
import { useEnvironments } from '../../environment/hooks/useEnvironments';
import { useDatasets } from '../../test-data/hooks/useDatasets';
import { useKnowledgeFlows } from '../../knowledge/hooks';
import { useAnalysis } from '../../analysis/hooks';
import { useRequirements } from '../../requirements/hooks';
import { useSuites } from '../../suite/hooks';
import { useExecution } from '../../execution/hooks';
import { useReports } from '../../report/hooks';
import {
  FolderOpen,
  Globe,
  Database,
  BookOpen,
  Sparkles,
  ListChecks,
  ShieldCheck,
  Target,
  FlaskConical,
  GitBranch,
  Layers,
  Play,
  BarChart3,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
} from 'lucide-react';

interface PipelineDashboardProps {
  projectId: string;
  projectName?: string;
}

type PipelineStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'READY' | 'WARNING' | 'COMPLETE' | 'BLOCKED';

interface PipelineStageInfo {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: PipelineStatus;
  count: number;
  countLabel: string;
  lastUpdated: number | null;
  actionLabel: string;
  actionPath: string;
  reason?: string;
  disabled?: boolean;
  disabledReason?: string;
}

const STATUS_STYLES: Record<PipelineStatus, { badge: string; dot: string; bar: string }> = {
  NOT_STARTED: {
    badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dot: 'bg-gray-400',
    bar: 'bg-gray-300',
  },
  IN_PROGRESS: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
  },
  READY: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    dot: 'bg-green-500',
    bar: 'bg-green-500',
  },
  WARNING: {
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    dot: 'bg-yellow-500',
    bar: 'bg-yellow-500',
  },
  COMPLETE: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    dot: 'bg-green-600',
    bar: 'bg-green-600',
  },
  BLOCKED: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    dot: 'bg-red-500',
    bar: 'bg-red-500',
  },
};

const formatLastUpdated = (timestamp: number | null): string => {
  if (!timestamp) return 'Never';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({ projectId, projectName }) => {
  const navigate = useNavigate();

  // Fetch data from existing hooks
  const { services } = useServices(projectId);
  const { environments } = useEnvironments(projectId);
  const { datasets } = useDatasets(projectId);
  const { flows } = useKnowledgeFlows(projectId);
  const { analysisCards } = useAnalysis(projectId);
  const { requirements, suggested, approved } = useRequirements(projectId);
  const { suites } = useSuites(projectId);
  const { runs } = useExecution(projectId);
  const { reports } = useReports(projectId);

  // Calculate pipeline stages
  const stages: PipelineStageInfo[] = React.useMemo(() => {
    const apiCount = services.length;
    const envCount = environments.length;
    const datasetCount = datasets.length;
    const flowCount = flows.length;
    const analysisCount = analysisCards.length;
    const reqCount = requirements.length;
    const suggestedCount = suggested.length;
    const approvedCount = approved.length;
    const suiteCount = suites.length;
    const executionCount = runs.length;
    const reportCount = reports.length;

    // Last updated timestamps
    const apiUpdated = services.length > 0 ? Math.max(...services.map(s => s.updatedAt || 0)) : null;
    const envUpdated = environments.length > 0 ? Math.max(...environments.map(e => e.updatedAt || 0)) : null;
    const datasetUpdated = datasets.length > 0 ? Math.max(...datasets.map(d => d.updatedAt || 0)) : null;
    const flowUpdated = flows.length > 0 ? Math.max(...flows.map(f => f.updatedAt || 0)) : null;
    const analysisUpdated = analysisCards.length > 0 ? Math.max(...analysisCards.map(a => a.updatedAt || 0)) : null;
    const reqUpdated = requirements.length > 0 ? Math.max(...requirements.map(r => r.updatedAt || 0)) : null;
    const suiteUpdated = suites.length > 0 ? Math.max(...suites.map(s => s.updatedAt || 0)) : null;
    const executionUpdated = runs.length > 0 ? Math.max(...runs.map(r => r.updatedAt || 0)) : null;
    const reportUpdated = reports.length > 0 ? Math.max(...reports.map(r => r.generatedAt || 0)) : null;

    // Dependency flags for guided actions
    const hasApis = apiCount > 0;
    const hasAnalysis = analysisCount > 0;
    const hasApprovedReqs = approvedCount > 0;
    const hasSuites = suiteCount > 0;

    return [
      {
        key: 'apis',
        label: 'APIs',
        icon: FolderOpen,
        status: apiCount === 0 ? 'NOT_STARTED' : 'COMPLETE',
        count: apiCount,
        countLabel: apiCount === 0 ? 'No services' : `${apiCount} Service${apiCount > 1 ? 's' : ''}`,
        lastUpdated: apiUpdated,
        actionLabel: apiCount === 0 ? 'Import APIs' : 'Import More',
        actionPath: `/projects/${projectId}/apis`,
        disabled: false,
      },
      {
        key: 'environment',
        label: 'Environment',
        icon: Globe,
        status: envCount === 0 ? 'NOT_STARTED' : 'COMPLETE',
        count: envCount,
        countLabel: envCount === 0 ? 'No environments' : `${envCount} Environment${envCount > 1 ? 's' : ''}`,
        lastUpdated: envUpdated,
        actionLabel: envCount === 0 ? 'Manage Environment' : 'Manage',
        actionPath: `/projects/${projectId}/environment`,
        disabled: false,
      },
      {
        key: 'testdata',
        label: 'Test Data',
        icon: Database,
        status: datasetCount === 0 ? 'NOT_STARTED' : 'READY',
        count: datasetCount,
        countLabel: datasetCount === 0 ? 'No datasets' : `${datasetCount} Dataset${datasetCount > 1 ? 's' : ''}`,
        lastUpdated: datasetUpdated,
        actionLabel: datasetCount === 0 ? 'Create Dataset' : 'Manage',
        actionPath: `/projects/${projectId}/testdata`,
        disabled: false,
      },
      {
        key: 'knowledge',
        label: 'Knowledge',
        icon: BookOpen,
        status: flowCount === 0 ? 'NOT_STARTED' : 'COMPLETE',
        count: flowCount,
        countLabel: flowCount === 0 ? 'No flows' : `${flowCount} Flow${flowCount > 1 ? 's' : ''}`,
        lastUpdated: flowUpdated,
        actionLabel: flowCount === 0 ? 'Add Knowledge' : 'Open',
        actionPath: `/projects/${projectId}/knowledge`,
        disabled: false,
      },
      {
        key: 'analysis',
        label: 'Analysis',
        icon: Sparkles,
        status: analysisCount === 0 ? 'NOT_STARTED' : 'COMPLETE',
        count: analysisCount,
        countLabel: analysisCount === 0 ? 'Not analyzed' : `${analysisCount} Analysis Card${analysisCount > 1 ? 's' : ''}`,
        lastUpdated: analysisUpdated,
        actionLabel: analysisCount === 0 ? 'Run Analysis' : 'View Analysis',
        actionPath: `/projects/${projectId}/requirements`,
        disabled: !hasApis,
        disabledReason: !hasApis ? 'Import APIs first.' : undefined,
      },
      {
        key: 'requirements',
        label: 'Requirements',
        icon: ListChecks,
        status: reqCount === 0 ? 'NOT_STARTED' : suggestedCount > 0 && approvedCount === 0 ? 'WARNING' : 'READY',
        count: reqCount,
        countLabel: reqCount === 0 ? 'No requirements' : `${suggestedCount} Suggested / ${approvedCount} Approved`,
        lastUpdated: reqUpdated,
        actionLabel: suggestedCount > 0 && approvedCount === 0 ? 'Approve Requirements' : reqCount === 0 ? 'Generate Requirements' : 'Open',
        actionPath: `/projects/${projectId}/requirements`,
        disabled: reqCount === 0 && !hasAnalysis,
        disabledReason: reqCount === 0 && !hasAnalysis ? 'Run Project Analysis first.' : undefined,
        reason: suggestedCount > 0 && approvedCount === 0 ? 'Nothing approved yet' : undefined,
      },
      {
        key: 'readiness',
        label: 'Readiness Validation',
        icon: ShieldCheck,
        status: approvedCount === 0 ? 'BLOCKED' : 'READY',
        count: approvedCount,
        countLabel: approvedCount === 0 ? 'No approved requirements' : `${approvedCount} Approved`,
        lastUpdated: reqUpdated,
        actionLabel: approvedCount === 0 ? 'Validate Readiness' : 'Validate',
        actionPath: `/projects/${projectId}/requirements`,
        disabled: !hasApprovedReqs,
        disabledReason: !hasApprovedReqs ? 'Approve at least one requirement.' : undefined,
        reason: approvedCount === 0 ? 'No approved requirements to validate' : undefined,
      },
      {
        key: 'strategy',
        label: 'Test Strategy',
        icon: Target,
        status: approvedCount === 0 ? 'BLOCKED' : 'NOT_STARTED',
        count: approvedCount,
        countLabel: approvedCount === 0 ? 'Waiting for approval' : `${approvedCount} Ready to plan`,
        lastUpdated: reqUpdated,
        actionLabel: approvedCount === 0 ? 'Generate Strategy' : 'Generate Strategy',
        actionPath: `/projects/${projectId}/requirements`,
        disabled: !hasApprovedReqs,
        disabledReason: !hasApprovedReqs ? 'Approve at least one requirement.' : undefined,
        reason: approvedCount === 0 ? 'Requires approved requirements' : undefined,
      },
      {
        key: 'design',
        label: 'Test Design',
        icon: FlaskConical,
        status: approvedCount === 0 ? 'BLOCKED' : 'NOT_STARTED',
        count: approvedCount,
        countLabel: approvedCount === 0 ? 'Waiting for strategy' : `${approvedCount} Ready`,
        lastUpdated: reqUpdated,
        actionLabel: approvedCount === 0 ? 'Generate Designs' : 'Generate Designs',
        actionPath: `/projects/${projectId}/requirements`,
        disabled: !hasApprovedReqs,
        disabledReason: !hasApprovedReqs ? 'Approve at least one requirement first.' : undefined,
        reason: approvedCount === 0 ? 'Requires test strategy' : undefined,
      },
      {
        key: 'executionplan',
        label: 'Execution Plan',
        icon: GitBranch,
        status: approvedCount === 0 ? 'BLOCKED' : 'NOT_STARTED',
        count: approvedCount,
        countLabel: approvedCount === 0 ? 'Waiting for test design' : `${approvedCount} Ready`,
        lastUpdated: reqUpdated,
        actionLabel: approvedCount === 0 ? 'Generate Plan' : 'Generate Plan',
        actionPath: `/projects/${projectId}/requirements`,
        disabled: !hasApprovedReqs,
        disabledReason: !hasApprovedReqs ? 'Test designs not generated.' : undefined,
        reason: approvedCount === 0 ? 'Test designs not generated' : undefined,
      },
      {
        key: 'suites',
        label: 'Test Suites',
        icon: Layers,
        status: suiteCount === 0 ? 'NOT_STARTED' : 'READY',
        count: suiteCount,
        countLabel: suiteCount === 0 ? 'No suites' : `${suiteCount} Suite${suiteCount > 1 ? 's' : ''}`,
        lastUpdated: suiteUpdated,
        actionLabel: suiteCount === 0 ? 'Create Suite' : 'Open',
        actionPath: `/projects/${projectId}/suites`,
        disabled: false,
      },
      {
        key: 'execution',
        label: 'Execution',
        icon: Play,
        status: executionCount === 0 ? 'NOT_STARTED' : 'COMPLETE',
        count: executionCount,
        countLabel: executionCount === 0 ? 'No runs' : `${executionCount} Run${executionCount > 1 ? 's' : ''}`,
        lastUpdated: executionUpdated,
        actionLabel: executionCount === 0 ? 'Run Suite' : 'View Runs',
        actionPath: `/projects/${projectId}/execution`,
        disabled: !hasSuites,
        disabledReason: !hasSuites ? 'Create a Test Suite.' : undefined,
      },
      {
        key: 'reports',
        label: 'Reports',
        icon: BarChart3,
        status: reportCount === 0 ? 'NOT_STARTED' : 'COMPLETE',
        count: reportCount,
        countLabel: reportCount === 0 ? 'No reports' : `${reportCount} Report${reportCount > 1 ? 's' : ''}`,
        lastUpdated: reportUpdated,
        actionLabel: reportCount === 0 ? 'Generate Report' : 'View Reports',
        actionPath: `/projects/${projectId}/reports`,
        disabled: executionCount === 0,
        disabledReason: executionCount === 0 ? 'Run an execution first.' : undefined,
      },
    ];
  }, [services, environments, datasets, flows, analysisCards, requirements, suggested, approved, suites, runs, reports, projectId]);

  // Calculate pipeline progress
  const completedStages = stages.filter(s => s.status === 'COMPLETE' || s.status === 'READY').length;
  const progressPercent = Math.round((completedStages / stages.length) * 100);

  const handleAction = (stage: PipelineStageInfo) => {
    navigate(stage.actionPath);
  };

  // Determine next recommended action
  const nextStep = React.useMemo(() => {
    const apiCount = services.length;
    const suggestedCount = suggested.length;
    const approvedCount = approved.length;
    const analysisCount = analysisCards.length;
    const executionCount = runs.length;
    const reportCount = reports.length;

    const blockedStage = stages.find(s => s.status === 'BLOCKED');
    if (blockedStage) {
      return {
        message: `${blockedStage.label} is blocked. ${blockedStage.disabledReason || blockedStage.reason || 'Take action to unblock.'}`,
        actionLabel: blockedStage.actionLabel,
        actionPath: blockedStage.actionPath,
      };
    }

    const needsAction = stages.find(s => s.status === 'NOT_STARTED' || s.status === 'WARNING');
    if (needsAction) {
      return {
        message: `Project is ready for ${needsAction.label}.`,
        actionLabel: needsAction.actionLabel,
        actionPath: needsAction.actionPath,
      };
    }

    if (suggestedCount > 0 && approvedCount === 0) {
      return {
        message: 'Project is ready for Requirement Approval.',
        actionLabel: 'Open Requirements',
        actionPath: `/projects/${projectId}/requirements`,
      };
    }

    if (apiCount > 0 && analysisCount === 0) {
      return {
        message: 'Run Project Analysis to generate requirements.',
        actionLabel: 'Run Analysis',
        actionPath: `/projects/${projectId}/requirements`,
      };
    }

    if (executionCount > 0 && reportCount === 0) {
      return {
        message: 'Execution is complete. Generate a report.',
        actionLabel: 'Generate Report',
        actionPath: `/projects/${projectId}/reports`,
      };
    }

    return {
      message: 'All pipeline stages are complete.',
      actionLabel: 'View Reports',
      actionPath: `/projects/${projectId}/reports`,
    };
  }, [stages, services.length, suggested.length, approved.length, analysisCards.length, runs.length, reports.length, projectId]);

  // Project health stats
  const healthStats = React.useMemo(() => {
    const reqCount = requirements.length;
    const approvedCount = approved.length;
    const approvedPercent = reqCount > 0 ? Math.round((approvedCount / reqCount) * 100) : 0;

    const completedStagesCount = stages.filter(s => s.status === 'COMPLETE' || s.status === 'READY').length;
    const pipelinePercent = Math.round((completedStagesCount / stages.length) * 100);

    const latestRun = runs.length > 0 ? [...runs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] : null;
    const latestReport = reports.length > 0 ? [...reports].sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))[0] : null;

    return {
      completionPercent: pipelinePercent,
      requirementsApproved: approvedPercent,
      executionCoverage: approvedCount > 0 ? Math.min(100, Math.round((runs.length / Math.max(approvedCount, 1)) * 100)) : 0,
      latestExecution: latestRun ? formatLastUpdated(latestRun.updatedAt) : 'Never',
      latestReport: latestReport ? formatLastUpdated(latestReport.generatedAt) : 'Never',
    };
  }, [stages, requirements, approved, runs, reports]);

  const handleNextStep = () => {
    navigate(nextStep.actionPath);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">{projectName || 'Project'} - Pipeline Dashboard</h2>
        <p className="text-sm text-text-secondary">Track and guide the validation pipeline for this project.</p>
      </div>

      {/* Next Recommended Action Panel */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary">Next Recommended Action</p>
              <p className="text-sm font-semibold text-text">{nextStep.message}</p>
            </div>
          </div>
          <Button onClick={handleNextStep}>
            {nextStep.actionLabel}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Project Health Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Project Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-text-secondary">Pipeline Completion</p>
              <p className="text-lg font-bold text-text">{healthStats.completionPercent}%</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Requirements Approved</p>
              <p className="text-lg font-bold text-text">{healthStats.requirementsApproved}%</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Execution Coverage</p>
              <p className="text-lg font-bold text-text">{healthStats.executionCoverage}%</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Latest Execution</p>
              <p className="text-sm font-semibold text-text">{healthStats.latestExecution}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Latest Report</p>
              <p className="text-sm font-semibold text-text">{healthStats.latestReport}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Progress */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-text">Pipeline Progress</span>
            <span className="text-sm font-semibold text-text">{progressPercent}%</span>
          </div>
          <div className="flex gap-1">
            {stages.map((stage) => {
              const isComplete = stage.status === 'COMPLETE' || stage.status === 'READY';
              const isWarning = stage.status === 'WARNING';
              const isBlocked = stage.status === 'BLOCKED';
              return (
                <div
                  key={stage.key}
                  className={`h-2 flex-1 rounded-full ${
                    isComplete ? 'bg-green-500' :
                    isWarning ? 'bg-yellow-500' :
                    isBlocked ? 'bg-red-500' :
                    'bg-gray-300 dark:bg-gray-700'
                  }`}
                  title={`${stage.label}: ${stage.status}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stages.map((stage) => (
              <span key={stage.key} className="text-xs text-text-secondary">
                {stage.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage) => {
          const Icon = stage.icon;
          const style = STATUS_STYLES[stage.status];
          const isDisabled = stage.disabled || false;
          return (
            <Card key={stage.key} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface">
                      <Icon className="h-5 w-5 text-text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{stage.label}</CardTitle>
                      <p className="text-xs text-text-secondary">{stage.countLabel}</p>
                    </div>
                  </div>
                  <Badge className={style.badge} variant="outline">
                    {stage.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-3 flex items-center gap-2 text-xs text-text-secondary">
                  <Clock className="h-3 w-3" />
                  <span>Last updated: {formatLastUpdated(stage.lastUpdated)}</span>
                </div>

                {isDisabled && stage.disabledReason && (
                  <div className="mb-3 rounded-lg bg-yellow-50 p-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="font-medium">Disabled</span>
                    </div>
                    <p className="mt-1">{stage.disabledReason}</p>
                  </div>
                )}

                {!isDisabled && stage.reason && (
                  <div className="mb-3 rounded-lg bg-yellow-50 p-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="font-medium">Reason</span>
                    </div>
                    <p className="mt-1">{stage.reason}</p>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                    <span className="text-xs font-medium text-text-secondary">{stage.status}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(stage)}
                    disabled={isDisabled}
                  >
                    {stage.actionLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineDashboard;