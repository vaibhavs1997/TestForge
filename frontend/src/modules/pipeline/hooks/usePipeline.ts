// usePipeline - React hook for pipeline operations
import { useState, useCallback } from 'react';
import { PipelineEntity, PipelineStage } from '../types';
import pipelineService from '../services/pipelineService';

export function usePipeline(projectId?: string) {
  const [pipeline, setPipeline] = useState<PipelineEntity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startPipeline = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await pipelineService.startPipeline(projectId);
      setPipeline(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start pipeline');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const refreshPipeline = useCallback(async (pipelineId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await pipelineService.getPipelineStatus(pipelineId);
      setPipeline(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  const restartStage = useCallback(async (pipelineId: string, stage: PipelineStage) => {
    setLoading(true);
    setError(null);
    try {
      const result = await pipelineService.restartStage(pipelineId, stage);
      setPipeline(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart stage');
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelPipeline = useCallback(async (pipelineId: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await pipelineService.cancelPipeline(pipelineId);
      setPipeline(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    pipeline,
    loading,
    error,
    startPipeline,
    refreshPipeline,
    restartStage,
    cancelPipeline,
  };
}