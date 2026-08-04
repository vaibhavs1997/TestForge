// PipelineService - API service for Pipeline operations
import { PipelineEntity, StartPipelineRequest, RestartStageRequest } from '../types';

const API_BASE_URL = '/api';

export class PipelineService {
  async startPipeline(projectId: string): Promise<PipelineEntity> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start pipeline');
    }

    return response.json();
  }

  async getPipelineStatus(pipelineId: string): Promise<PipelineEntity> {
    const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}`);

    if (!response.ok) {
      throw new Error('Failed to get pipeline status');
    }

    return response.json();
  }

  async getProjectPipelines(projectId: string): Promise<PipelineEntity[]> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pipelines`);

    if (!response.ok) {
      throw new Error('Failed to get project pipelines');
    }

    return response.json();
  }

  async restartStage(pipelineId: string, stage: string): Promise<PipelineEntity> {
    const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stage } as RestartStageRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to restart stage');
    }

    return response.json();
  }

  async cancelPipeline(pipelineId: string): Promise<PipelineEntity> {
    const response = await fetch(`${API_BASE_URL}/pipelines/${pipelineId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to cancel pipeline');
    }

    return response.json();
  }

  async runAIPipeline(projectId: string, body: { providerId: string; autoApprove?: boolean }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pipeline/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || 'Failed to run AI pipeline');
    }

    return response.json();
  }
}

export default new PipelineService();