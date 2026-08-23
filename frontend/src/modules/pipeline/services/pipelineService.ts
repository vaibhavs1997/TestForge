// PipelineService - API service for Pipeline operations
import { PipelineEntity, StartPipelineRequest, RestartStageRequest } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

export class PipelineService {
  async startPipeline(projectId: string): Promise<PipelineEntity> {
    return apiRequest.post<PipelineEntity>(`${API_BASE_URL}/projects/${projectId}/pipeline`);
  }

  async getPipelineStatus(pipelineId: string): Promise<PipelineEntity> {
    return apiRequest.get<PipelineEntity>(`${API_BASE_URL}/pipelines/${pipelineId}`);
  }

  async getProjectPipelines(projectId: string): Promise<PipelineEntity[]> {
    return apiRequest.get<PipelineEntity[]>(`${API_BASE_URL}/projects/${projectId}/pipelines`);
  }

  async restartStage(pipelineId: string, stage: string): Promise<PipelineEntity> {
    return apiRequest.post<PipelineEntity>(`${API_BASE_URL}/pipelines/${pipelineId}/restart`, { stage } as RestartStageRequest);
  }

  async cancelPipeline(pipelineId: string): Promise<PipelineEntity> {
    return apiRequest.post<PipelineEntity>(`${API_BASE_URL}/pipelines/${pipelineId}/cancel`);
  }

  async runAIPipeline(projectId: string, body: { providerId: string; autoApprove?: boolean }): Promise<any> {
    return apiRequest.post<any>(`${API_BASE_URL}/projects/${projectId}/pipeline/ai`, body);
  }
}

export default new PipelineService();
