// Report service functions
import { apiAxios } from '../../../services/apiAxios';
import type { Report, ReportGeneratePayload } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const reportService = {
  listReports: async (projectId: string): Promise<Report[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/reports`);
    return data.data;
  },

  getReport: async (projectId: string, reportId: string): Promise<Report> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/reports/${reportId}`);
    return data.data;
  },

  generateReport: async (projectId: string, payload: ReportGeneratePayload): Promise<Report> => {
    const { data } = await apiAxios.post(
      `${API_BASE_URL}/projects/${projectId}/reports/generate/${payload.executionRunId}`,
      { suiteId: payload.suiteId },
    );
    return data.data;
  },

  publishToJira: async (projectId: string, reportId: string, issueKey?: string): Promise<{ issueKey: string }> => {
    const { data } = await apiAxios.post(
      `${API_BASE_URL}/projects/${projectId}/reports/${reportId}/publish-jira`,
      issueKey ? { issueKey } : {},
    );
    return data.data;
  },

  deleteReport: async (projectId: string, reportId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/reports/${reportId}`);
  },
};

export default reportService;
