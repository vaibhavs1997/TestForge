// External libraries
import { httpClient } from './HttpClient';
import type { ProjectDto } from '../types/apiModels';

// Shared types
export interface DashboardData {
  summaryCards: {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
  }[];
  recentActivity: {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    type: 'test' | 'suite' | 'report' | 'project';
    status: 'success' | 'failed' | 'running' | 'pending';
  }[];
}

// Services

export class ProjectService {
  async listProjects(): Promise<ProjectDto[]> {
    return httpClient.get<ProjectDto[]>('/projects');
  }

  async getProject(projectId: string): Promise<ProjectDto> {
    return httpClient.get<ProjectDto>(`/projects/${projectId}`);
  }

  async createProject(data: Partial<ProjectDto>): Promise<ProjectDto> {
    return httpClient.post<ProjectDto>('/projects', data);
  }

  async updateProject(projectId: string, data: Partial<ProjectDto>): Promise<ProjectDto> {
    return httpClient.patch<ProjectDto>(`/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string): Promise<void> {
    await httpClient.delete(`/projects/${projectId}`);
  }

  async getDashboardData(projectId: string): Promise<DashboardData> {
    return httpClient.get<DashboardData>(`/projects/${projectId}/dashboard`);
  }
}

export default ProjectService;

export const projectService = new ProjectService();
