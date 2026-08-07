import { apiAxios } from '../../../services/apiAxios';
import { API_BASE_URL } from '../../../constants/api';
import type { TestDesign, DesignStatus, ExecutionPlan } from '../types';

export const testDesignService = {
  async listByRequirement(projectId: string, requirementId: string): Promise<TestDesign[]> {
    const { data } = await apiAxios.get(
      `${API_BASE_URL}/projects/${projectId}/requirements/${requirementId}/test-designs`,
    );
    return data.data ?? [];
  },

  async updateStatus(projectId: string, testDesignId: string, status: DesignStatus): Promise<TestDesign> {
    const { data } = await apiAxios.patch(
      `${API_BASE_URL}/projects/${projectId}/test-designs/${testDesignId}`,
      { status },
    );
    return data.data;
  },
};

export const executionPlanService = {
  async listByRequirement(projectId: string, requirementId: string): Promise<ExecutionPlan[]> {
    const { data } = await apiAxios.get(
      `${API_BASE_URL}/projects/${projectId}/requirements/${requirementId}/execution-plans`,
    );
    return data.data ?? [];
  },

  async updateStatus(
    projectId: string,
    executionPlanId: string,
    status: ExecutionPlan['status'],
  ): Promise<ExecutionPlan> {
    const { data } = await apiAxios.patch(
      `${API_BASE_URL}/projects/${projectId}/execution-plans/${executionPlanId}`,
      { status },
    );
    return data.data;
  },
};

export default testDesignService;
