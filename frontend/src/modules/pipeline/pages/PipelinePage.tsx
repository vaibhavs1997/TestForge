// PipelinePage - Project Pipeline Orchestration Page
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePipeline } from '../hooks/usePipeline';
import { useAIProviders } from '../../ai-provider/hooks';
import { PipelineStage, PipelineStatus } from '../types';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';

interface PipelinePageProps {
  projectId: string;
}

const STAGE_ORDER: PipelineStage[] = [
  'API Import',
  'Environment Detection',
  'Project Analysis',
  'Requirement Generation',
  'Requirement Readiness Validation',
  'Test Strategy',
  'Test Design',
  'Execution Planning'
];

const AI_STAGES = ['Requirements', 'Strategy', 'Design', 'Assertions', 'Execution Plans', 'Suites'];

const STATUS_ICONS: Record<PipelineStatus, string> = {
  pending: '○',
  running: '◐',
  completed: '✓',
  failed: '✗',
  cancelled: '⊘'
};

const STATUS_COLORS: Record<PipelineStatus, string> = {
  pending: 'text-text-secondary',
  running: 'text-primary',
  completed: 'text-success',
  failed: 'text-error',
  cancelled: 'text-text-secondary'
};

const AI_STATUS_ICONS: Record<string, string> = {
  Pending: '○',
  Running: '◐',
  Completed: '✓',
  Failed: '✗',
  Skipped: '⊘'
};

const AI_STATUS_COLORS: Record<string, string> = {
  Pending: 'text-text-secondary',
  Running: 'text-primary',
  Completed: 'text-success',
  Failed: 'text-error',
  Skipped: 'text-text-secondary'
};

const getPipelineStages = (pipeline: { stages?: unknown } | null): any[] =>
  Array.isArray(pipeline?.stages) ? pipeline.stages : [];

export const PipelinePage: React.FC<PipelinePageProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const { pipeline, loading, error, startPipeline, restartStage, cancelPipeline, runAIPipeline } = usePipeline(projectId);
  const { providers: aiProviders } = useAIProviders(projectId);

  const [aiProviderId, setAiProviderId] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiRunning, setAiRunning] = useState(false);

  const getStageStatus = (stage: PipelineStage): PipelineStatus => {
    if (!pipeline) return 'pending';
    const stageResult = getPipelineStages(pipeline).find((s: any) => s.stage === stage);
    return stageResult?.status || 'pending';
  };

  const getStageDuration = (stage: PipelineStage): string | null => {
    if (!pipeline) return null;
    const stageResult = getPipelineStages(pipeline).find((s: any) => s.stage === stage);
    if (!stageResult?.startedAt || !stageResult?.completedAt) return null;
    const duration = stageResult.completedAt - stageResult.startedAt;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const isStageRunning = (stage: PipelineStage): boolean => {
    return pipeline?.currentStage === stage && pipeline?.status === 'running';
  };

  const handleRunEntirePipeline = async () => {
    await startPipeline();
  };

  const handleRetryStage = async (stage: PipelineStage) => {
    if (!pipeline) return;
    await restartStage({ pipelineId: pipeline.id, stage });
  };

  const handleCancelPipeline = async () => {
    if (!pipeline) return;
    if (window.confirm('Are you sure you want to cancel the pipeline?')) {
      await cancelPipeline(pipeline.id);
    }
  };

  const handleRunAIPipeline = async () => {
    if (!aiProviderId) return;
    setAiRunning(true);
    setAiResult(null);
    const result = await runAIPipeline({ providerId: aiProviderId, autoApprove });
    setAiResult(result);
    setAiRunning(false);
  };

  const formatDuration = (ms: number) => {
    if (!ms) return '—';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="pipeline-page w-full px-4 py-6 lg:px-8">
      {/* Optional-workflows banner intentionally omitted from the pipeline page.
        projectId={projectId}
        description="Automated multi-stage orchestration (analysis, strategy, design, plans). Most teams use Requirements → Generate test cases → Run instead."
        primaryLink={{
          label: 'Open requirements',
          path: `/projects/${projectId}/requirements`,
        }}
      */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 text-text">Pipeline orchestration</h1>
        <p className="text-sm text-text-secondary mb-4">
          Run the full validation pipeline or an AI-assisted batch. For day-to-day work, prefer Get started on the project home.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-4"
          onClick={() => navigate(`/projects/${projectId}/overview`)}
        >
          ← Get started
        </Button>

        {/* AI Pipeline Controls */}
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <h2 className="text-lg font-semibold text-primary mb-3">AI Pipeline</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-primary mb-1">AI Provider</label>
              <SelectField
                className='w-full'
                value={aiProviderId}
                onChange={setAiProviderId}
                options={[
                  { value: '', label: 'Select a provider...' },
                  ...aiProviders.map((provider) => ({
                    value: provider.id,
                    label: `${provider.name} (${provider.provider} - ${provider.model})${provider.isDefault ? ' [Default]' : ''}`,
                  })),
                ]}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-primary pb-2">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Auto-approve requirements
            </label>
            <button
              onClick={handleRunAIPipeline}
              disabled={!aiProviderId || aiRunning || loading}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:bg-background disabled:text-text-secondary"
            >
              {aiRunning ? 'Running AI Pipeline...' : 'Run AI Pipeline'}
            </button>
          </div>
        </div>

        {!pipeline && (
          <button
            onClick={handleRunEntirePipeline}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:bg-background disabled:text-text-secondary"
          >
            {loading ? 'Running...' : 'Run Entire Pipeline'}
          </button>
        )}

        {pipeline && pipeline.status === 'running' && (
          <button
            onClick={handleCancelPipeline}
            className="px-4 py-2 bg-error text-white rounded hover:bg-error/90 ml-2"
          >
            Cancel Pipeline
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error/40 bg-error/15 p-4 text-error">
          {error}
        </div>
      )}

      {/* AI Pipeline Progress */}
      {aiResult && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-primary">AI Pipeline Result</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-primary">
                Status: <strong>{aiResult.status}</strong>
              </span>
              <span className="text-primary">
                Elapsed: <strong>{formatDuration(aiResult.totalDurationMs)}</strong>
              </span>
            </div>
          </div>

          {/* Stage progress */}
          <div className="space-y-2">
            {AI_STAGES.map((stage) => {
              const stageResult = aiResult.stages?.find((s: any) => s.stage === stage);
              const status = stageResult?.status || 'Pending';
              return (
                <div key={stage} className="flex items-center gap-3 rounded border border-border bg-surface p-2">
                  <span className={`text-xl ${AI_STATUS_COLORS[status]}`}>{AI_STATUS_ICONS[status]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text">{stage}</span>
                      <span className={`text-sm ${AI_STATUS_COLORS[status]}`}>{status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-secondary mt-1">
                      <span>Duration: {formatDuration(stageResult?.durationMs)}</span>
                      <span>Generated: {stageResult?.generatedCount ?? 0}</span>
                      {stageResult?.error && (
                        <span className="text-error">Error: {stageResult.error}</span>
                      )}
                    </div>
                    {stageResult?.warnings && stageResult.warnings.length > 0 && (
                        <div className="mt-1 text-xs text-warning">
                        {stageResult.warnings.map((w: string, i: number) => (
                          <div key={i}>• {w}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generated artifact counts */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <div className="p-2 bg-surface rounded border border-border">
              <span className="text-text-secondary">Requirements:</span>{' '}
              <strong className="text-primary">{aiResult.requirementIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-surface rounded border border-border">
              <span className="text-text-secondary">Strategies:</span>{' '}
              <strong className="text-primary">{aiResult.strategyIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-surface rounded border border-border">
              <span className="text-text-secondary">Designs:</span>{' '}
              <strong className="text-primary">{aiResult.designIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-surface rounded border border-border">
              <span className="text-text-secondary">Assertions:</span>{' '}
              <strong className="text-primary">{aiResult.assertionIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-surface rounded border border-border">
              <span className="text-text-secondary">Execution Plans:</span>{' '}
              <strong className="text-primary">{aiResult.executionPlanIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-surface rounded border border-border">
              <span className="text-text-secondary">Suites:</span>{' '}
              <strong className="text-primary">{aiResult.suiteIds?.length || 0}</strong>
            </div>
          </div>

          {aiResult.warnings && aiResult.warnings.length > 0 && (
            <div className="mt-3 rounded border border-warning/30 bg-warning/10 p-2 text-sm text-warning">
              {aiResult.warnings.map((w: string, i: number) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {pipeline && (
        <div className="mb-4 rounded-lg border border-border bg-surface p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-text-secondary">Pipeline Status</p>
              <p className={`text-lg font-semibold ${STATUS_COLORS[pipeline.status as PipelineStatus]}`}>
                {pipeline.status.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Started</p>
              <p className="text-sm">{new Date(pipeline.startedAt).toLocaleTimeString()}</p>
            </div>
            {pipeline.completedAt && (
              <div>
                <p className="text-sm text-text-secondary">Completed</p>
                <p className="text-sm">{new Date(pipeline.completedAt).toLocaleTimeString()}</p>
              </div>
            )}
          </div>
          {pipeline.error && (
            <div className="mt-2 rounded border border-error/30 bg-error/10 p-2 text-sm text-error">
              Error: {pipeline.error}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {STAGE_ORDER.map((stage, index) => {
          const status = getStageStatus(stage);
          const duration = getStageDuration(stage);
          const running = isStageRunning(stage);
          const stageResult = getPipelineStages(pipeline).find((s: any) => s.stage === stage);

          return (
            <div
              key={stage}
              className={`border rounded-lg p-4 ${
                status === 'completed' ? 'bg-success/10 border-success/30' :
                status === 'failed' ? 'bg-error/10 border-error/30' :
                status === 'running' ? 'bg-primary/10 border-primary/30' :
                'bg-surface border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl ${STATUS_COLORS[status]}`}>
                      {running ? '◐' : STATUS_ICONS[status]}
                    </span>
                    <div>
                      <h3 className="font-semibold text-lg">{stage}</h3>
                      <p className={`text-sm ${STATUS_COLORS[status]}`}>
                        {status.toUpperCase()}
                      </p>
                    </div>
                  </div>

                  {duration && (
                    <p className="text-sm text-text-secondary mt-2 ml-9">
                      Duration: {duration}
                    </p>
                  )}

                  {stageResult?.artifacts && Object.keys(stageResult.artifacts).length > 0 && (
                    <div className="mt-2 ml-9">
                      <p className="text-sm font-semibold text-text-secondary">Artifacts:</p>
                      <pre className="text-xs text-text-secondary mt-1 bg-background p-2 rounded">
                        {JSON.stringify(stageResult.artifacts, null, 2)}
                      </pre>
                    </div>
                  )}

                  {stageResult?.error && (
                    <div className="mt-2 ml-9 rounded border border-error/30 bg-error/10 p-2 text-sm text-error">
                      {stageResult.error}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {status === 'completed' && (
                    <button
                      onClick={() => {}}
                      className="px-3 py-1 text-sm bg-background text-text rounded hover:bg-surface"
                    >
                      View Result
                    </button>
                  )}

                  {(status === 'failed' || status === 'cancelled') && (
                    <button
                      onClick={() => handleRetryStage(stage)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-warning text-white rounded hover:bg-warning/90 disabled:bg-background disabled:text-text-secondary"
                    >
                      Retry Stage
                    </button>
                  )}

                  {pipeline && index < STAGE_ORDER.indexOf(pipeline.currentStage) && status === 'pending' && (
                    <button
                      onClick={() => handleRetryStage(stage)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90 disabled:bg-background disabled:text-text-secondary"
                    >
                      Run Stage
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelinePage;
