// Report service functions
import type { Report, ReportGeneratePayload } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

export const reportService = {
  listReports: async (projectId: string): Promise<Report[]> => {
    return apiRequest.get<Report[]>(`${API_BASE_URL}/projects/${projectId}/reports`);
  },

  getReport: async (projectId: string, reportId: string): Promise<Report> => {
    return apiRequest.get<Report>(`${API_BASE_URL}/projects/${projectId}/reports/${reportId}`);
  },

  generateReport: async (projectId: string, payload: ReportGeneratePayload): Promise<Report> => {
    return apiRequest.post<Report>(
      `${API_BASE_URL}/projects/${projectId}/reports/generate/${payload.executionRunId}`,
      { suiteId: payload.suiteId },
    );
  },

  publishToJira: async (projectId: string, reportId: string, issueKey?: string): Promise<{ issueKey: string }> => {
    return apiRequest.post<{ issueKey: string }>(
      `${API_BASE_URL}/projects/${projectId}/reports/${reportId}/publish-jira`,
      issueKey ? { issueKey } : {},
    );
  },

  deleteReport: async (projectId: string, reportId: string): Promise<void> => {
    await apiRequest.delete(`${API_BASE_URL}/projects/${projectId}/reports/${reportId}`);
  },
};

export default reportService;
