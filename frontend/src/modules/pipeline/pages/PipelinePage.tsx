// PipelinePage - Project Pipeline Orchestration Page
import React, { useState } from 'react';
import { usePipeline } from '../hooks/usePipeline';
import { useAIProviders } from '../../ai-provider/hooks';
import { PipelineStage, PipelineStatus } from '../types';

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
  pending: 'text-gray-400',
  running: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
  cancelled: 'text-gray-500'
};

const AI_STATUS_ICONS: Record<string, string> = {
  Pending: '○',
  Running: '◐',
  Completed: '✓',
  Failed: '✗',
  Skipped: '⊘'
};

const AI_STATUS_COLORS: Record<string, string> = {
  Pending: 'text-gray-400',
  Running: 'text-blue-500',
  Completed: 'text-green-500',
  Failed: 'text-red-500',
  Skipped: 'text-gray-500'
};

export const PipelinePage: React.FC<PipelinePageProps> = ({ projectId }) => {
  const { pipeline, loading, error, startPipeline, restartStage, cancelPipeline, runAIPipeline } = usePipeline(projectId);
  const { providers: aiProviders } = useAIProviders(projectId);

  const [aiProviderId, setAiProviderId] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiRunning, setAiRunning] = useState(false);

  const getStageStatus = (stage: PipelineStage): PipelineStatus => {
    if (!pipeline) return 'pending';
    const stageResult = pipeline.stages.find((s: any) => s.stage === stage);
    return stageResult?.status || 'pending';
  };

  const getStageDuration = (stage: PipelineStage): string | null => {
    if (!pipeline) return null;
    const stageResult = pipeline.stages.find((s: any) => s.stage === stage);
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
    <div className="pipeline-page p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Project Pipeline</h1>

        {/* AI Pipeline Controls */}
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded">
          <h2 className="text-lg font-semibold text-purple-800 mb-3">AI Pipeline</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-purple-800 mb-1">AI Provider</label>
              <select
                value={aiProviderId}
                onChange={(e) => setAiProviderId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
              >
                <option value="">Select a provider...</option>
                {aiProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} ({provider.provider} - {provider.model}){provider.isDefault ? ' [Default]' : ''}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-purple-800 pb-2">
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
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {aiRunning ? 'Running AI Pipeline...' : 'Run AI Pipeline'}
            </button>
          </div>
        </div>

        {!pipeline && (
          <button
            onClick={handleRunEntirePipeline}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Running...' : 'Run Entire Pipeline'}
          </button>
        )}

        {pipeline && pipeline.status === 'running' && (
          <button
            onClick={handleCancelPipeline}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2"
          >
            Cancel Pipeline
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* AI Pipeline Progress */}
      {aiResult && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-purple-800">AI Pipeline Result</h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-purple-800">
                Status: <strong>{aiResult.status}</strong>
              </span>
              <span className="text-purple-800">
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
                <div key={stage} className="flex items-center gap-3 p-2 bg-white rounded border border-purple-100">
                  <span className={`text-xl ${AI_STATUS_COLORS[status]}`}>{AI_STATUS_ICONS[status]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-purple-900">{stage}</span>
                      <span className={`text-sm ${AI_STATUS_COLORS[status]}`}>{status}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                      <span>Duration: {formatDuration(stageResult?.durationMs)}</span>
                      <span>Generated: {stageResult?.generatedCount ?? 0}</span>
                      {stageResult?.error && (
                        <span className="text-red-600">Error: {stageResult.error}</span>
                      )}
                    </div>
                    {stageResult?.warnings && stageResult.warnings.length > 0 && (
                      <div className="mt-1 text-xs text-yellow-700">
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
            <div className="p-2 bg-white rounded border border-purple-100">
              <span className="text-gray-600">Requirements:</span>{' '}
              <strong className="text-purple-800">{aiResult.requirementIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-white rounded border border-purple-100">
              <span className="text-gray-600">Strategies:</span>{' '}
              <strong className="text-purple-800">{aiResult.strategyIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-white rounded border border-purple-100">
              <span className="text-gray-600">Designs:</span>{' '}
              <strong className="text-purple-800">{aiResult.designIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-white rounded border border-purple-100">
              <span className="text-gray-600">Assertions:</span>{' '}
              <strong className="text-purple-800">{aiResult.assertionIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-white rounded border border-purple-100">
              <span className="text-gray-600">Execution Plans:</span>{' '}
              <strong className="text-purple-800">{aiResult.executionPlanIds?.length || 0}</strong>
            </div>
            <div className="p-2 bg-white rounded border border-purple-100">
              <span className="text-gray-600">Suites:</span>{' '}
              <strong className="text-purple-800">{aiResult.suiteIds?.length || 0}</strong>
            </div>
          </div>

          {aiResult.warnings && aiResult.warnings.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
              {aiResult.warnings.map((w: string, i: number) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {pipeline && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Pipeline Status</p>
              <p className={`text-lg font-semibold ${STATUS_COLORS[pipeline.status as PipelineStatus]}`}>
                {pipeline.status.toUpperCase()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Started</p>
              <p className="text-sm">{new Date(pipeline.startedAt).toLocaleTimeString()}</p>
            </div>
            {pipeline.completedAt && (
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-sm">{new Date(pipeline.completedAt).toLocaleTimeString()}</p>
              </div>
            )}
          </div>
          {pipeline.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
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
          const stageResult = pipeline?.stages.find((s: any) => s.stage === stage);

          return (
            <div
              key={stage}
              className={`border rounded-lg p-4 ${
                status === 'completed' ? 'bg-green-50 border-green-200' :
                status === 'failed' ? 'bg-red-50 border-red-200' :
                status === 'running' ? 'bg-blue-50 border-blue-200' :
                'bg-gray-50 border-gray-200'
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
                    <p className="text-sm text-gray-600 mt-2 ml-9">
                      Duration: {duration}
                    </p>
                  )}

                  {stageResult?.artifacts && Object.keys(stageResult.artifacts).length > 0 && (
                    <div className="mt-2 ml-9">
                      <p className="text-sm font-semibold text-gray-700">Artifacts:</p>
                      <pre className="text-xs text-gray-600 mt-1 bg-white p-2 rounded">
                        {JSON.stringify(stageResult.artifacts, null, 2)}
                      </pre>
                    </div>
                  )}

                  {stageResult?.error && (
                    <div className="mt-2 ml-9 p-2 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                      {stageResult.error}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  {status === 'completed' && (
                    <button
                      onClick={() => {}}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      View Result
                    </button>
                  )}

                  {(status === 'failed' || status === 'cancelled') && (
                    <button
                      onClick={() => handleRetryStage(stage)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-400"
                    >
                      Retry Stage
                    </button>
                  )}

                  {pipeline && index < STAGE_ORDER.indexOf(pipeline.currentStage) && status === 'pending' && (
                    <button
                      onClick={() => handleRetryStage(stage)}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
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