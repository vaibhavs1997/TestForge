// Report service functions
import axios from 'axios';
import type { Report, ReportGeneratePayload } from '../types';

const API_BASE = '/api';

export const reportService = {
  listReports: async (projectId: string): Promise<Report[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/reports`);
    return data.data;
  },

  getReport: async (projectId: string, reportId: string): Promise<Report> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/reports/${reportId}`);
    return data.data;
  },

  generateReport: async (projectId: string, payload: ReportGeneratePayload): Promise<Report> => {
    const { data } = await axios.post(
      `${API_BASE}/projects/${projectId}/reports/generate/${payload.executionRunId}`,
      { suiteId: payload.suiteId }
    );
    return data.data;
  },

  deleteReport: async (projectId: string, reportId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/projects/${projectId}/reports/${reportId}`);
  },
};

export default reportService;