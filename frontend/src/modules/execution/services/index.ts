// Execution service functions
import axios from 'axios';
import { apiAxios } from '../../../services/apiAxios';
import type { ExecutionPlanDto, ExecutionRunDto } from '../../../types/moduleContracts';
import { normalizeExecutionPlan, normalizeExecutionRun } from '../../../utils/moduleAdapters';
import type { ExecutionPlan } from '../../requirements/types';
import { API_BASE_URL } from '../../../constants/api';

export const executionService = {
  startExecution: async (
    projectId: string,
    executionPlanId: string,
    failureMode?: string,
    executionProfileId?: string,
  ): Promise<ExecutionRunDto> => {
    const { data } = await apiAxios.post(
      `${API_BASE_URL}/projects/${projectId}/executions/${executionPlanId}/start`,
      { failureMode, executionProfileId },
    );
    return normalizeExecutionRun(data.data as ExecutionRunDto);
  },

  getExecution: async (projectId: string, runId: string): Promise<ExecutionRunDto> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/executions/${runId}`);
    return normalizeExecutionRun(data.data as ExecutionRunDto);
  },

  listExecutions: async (projectId: string): Promise<ExecutionRunDto[]> => {
    try {
      const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/executions`);
      const runs = data?.data;
      return Array.isArray(runs) ? runs.map((run) => normalizeExecutionRun(run as ExecutionRunDto)) : [];
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const serverMessage = err.response?.data?.message;
        if (typeof serverMessage === 'string' && serverMessage.length > 0) {
          throw new Error(serverMessage);
        }
      }
      throw err;
    }
  },

  listExecutionPlans: async (projectId: string): Promise<ExecutionPlan[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/execution-plans`);
    return Array.isArray(data.data)
      ? (data.data as ExecutionPlanDto[])
          .filter((plan) => plan && typeof plan.testDesignId === 'string' && typeof plan.operationId === 'string' && plan.requestTemplate && typeof plan.requestTemplate === 'object')
          .map(normalizeExecutionPlan)
      : [];
  },

  deleteExecution: async (projectId: string, runId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/executions/${runId}`);
  },

  deleteAllExecutions: async (projectId: string): Promise<{ deleted: number }> => {
    const { data } = await apiAxios.delete(`${API_BASE_URL}/projects/${projectId}/executions`);
    return data?.data ?? { deleted: 0 };
  },
};

export default executionService;
