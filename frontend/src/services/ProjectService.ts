// External libraries
import { httpClient } from './HttpClient';

// Shared types
export interface Project {
  id: string;
  name: string;
  projectKey: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

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
  async listProjects(): Promise<Project[]> {
    return httpClient.get<Project[]>('/api/projects');
  }

  async getProject(projectId: string): Promise<Project> {
    return httpClient.get<Project>(`/api/projects/${projectId}`);
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    return httpClient.post<Project>('/api/projects', data);
  }

  async updateProject(projectId: string, data: Partial<Project>): Promise<Project> {
    return httpClient.patch<Project>(`/api/projects/${projectId}`, data);
  }

  async deleteProject(projectId: string): Promise<void> {
    await httpClient.delete(`/api/projects/${projectId}`);
  }

  async getDashboardData(projectId: string): Promise<DashboardData> {
    return httpClient.get<DashboardData>(`/api/projects/${projectId}/dashboard`);
  }
}

export default ProjectService;

export const projectService = new ProjectService();
