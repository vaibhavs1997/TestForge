// Execution service functions
import axios from 'axios';
import type { ExecutionRun, ExecutionRunCreatePayload } from '../types';

const API_BASE = '/api';

export const executionService = {
  startExecution: async (projectId: string, executionPlanId: string, failureMode?: string, executionProfileId?: string): Promise<ExecutionRun> => {
    const { data } = await axios.post(
      `${API_BASE}/projects/${projectId}/executions/${executionPlanId}/start`,
      { failureMode, executionProfileId }
    );
    return data.data;
  },

  getExecution: async (projectId: string, runId: string): Promise<ExecutionRun> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/executions/${runId}`);
    return data.data;
  },

  listExecutions: async (projectId: string): Promise<ExecutionRun[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/executions`);
    return data.data;
  },
};

export default executionService;