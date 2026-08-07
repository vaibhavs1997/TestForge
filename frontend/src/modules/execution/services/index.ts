// Execution service functions
import { apiAxios } from '../../../services/apiAxios';
import type { ExecutionRun } from '../types';
import type { ExecutionPlan } from '../../requirements/types';
import { API_BASE_URL } from '../../../constants/api';

export const executionService = {
  startExecution: async (
    projectId: string,
    executionPlanId: string,
    failureMode?: string,
    executionProfileId?: string,
  ): Promise<ExecutionRun> => {
    const { data } = await apiAxios.post(
      `${API_BASE_URL}/projects/${projectId}/executions/${executionPlanId}/start`,
      { failureMode, executionProfileId },
    );
    return data.data;
  },

  getExecution: async (projectId: string, runId: string): Promise<ExecutionRun> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/executions/${runId}`);
    return data.data;
  },

  listExecutions: async (projectId: string): Promise<ExecutionRun[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/executions`);
    return data.data;
  },

  listExecutionPlans: async (projectId: string): Promise<ExecutionPlan[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/execution-plans`);
    return data.data ?? [];
  },
};

export default executionService;
