// PipelinePage - Project Pipeline Orchestration Page
import React from 'react';
import { usePipeline } from '../hooks/usePipeline';
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

export const PipelinePage: React.FC<PipelinePageProps> = ({ projectId }) => {
  const { pipeline, loading, error, startPipeline, restartStage, cancelPipeline } = usePipeline(projectId);

  const getStageStatus = (stage: PipelineStage): PipelineStatus => {
    if (!pipeline) return 'pending';
    const stageResult = pipeline.stages.find(s => s.stage === stage);
    return stageResult?.status || 'pending';
  };

  const getStageDuration = (stage: PipelineStage): string | null => {
    if (!pipeline) return null;
    const stageResult = pipeline.stages.find(s => s.stage === stage);
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
    await restartStage(pipeline.id, stage);
  };

  const handleCancelPipeline = async () => {
    if (!pipeline) return;
    if (window.confirm('Are you sure you want to cancel the pipeline?')) {
      await cancelPipeline(pipeline.id);
    }
  };

  return (
    <div className="pipeline-page p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Project Pipeline</h1>
        
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

      {pipeline && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Pipeline Status</p>
              <p className={`text-lg font-semibold ${STATUS_COLORS[pipeline.status]}`}>
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
          const stageResult = pipeline?.stages.find(s => s.stage === stage);

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