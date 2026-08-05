// Requirement service for Requirement Workspace
import { ApiClient } from '../../../services/ApiClient';
import type { Requirement, RequirementFormData, ValidationReport, TestStrategy, TestDesign, ExecutionPlan } from '../types';

class RequirementService extends ApiClient<Requirement> {
  constructor() {
    super('/projects/:projectId/requirements');
  }

  async listRequirements(projectId: string, approvalStatus?: string): Promise<Requirement[]> {
    const params = approvalStatus ? { approvalStatus } : {};
    return this.list(projectId, params);
  }

  async getRequirement(projectId: string, requirementId: string): Promise<Requirement> {
    return this.get(projectId, requirementId);
  }

  async createRequirement(projectId: string, payload: RequirementFormData): Promise<Requirement> {
    return this.create(projectId, payload);
  }

  async updateRequirement(projectId: string, requirementId: string, payload: Partial<RequirementFormData>): Promise<Requirement> {
    return this.patch(projectId, requirementId, payload);
  }

  async deleteRequirement(projectId: string, requirementId: string): Promise<void> {
    return this.delete(projectId, requirementId);
  }

  async generateFromAnalysis(projectId: string, analysisId: string): Promise<Requirement[]> {
    const path = `/projects/${projectId}/requirements/from-analysis/${analysisId}`;
    return this.post(path);
  }

  async generateWithAI(projectId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> {
    const path = `/projects/${projectId}/requirements/generate-ai`;
    return this.post(path, body);
  }

  async generateStrategyWithAI(projectId: string, requirementId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> {
    const path = `/projects/${projectId}/requirements/${requirementId}/strategy-ai`;
    return this.post(path, body);
  }

  async generateDesignWithAI(projectId: string, requirementId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> {
    const path = `/projects/${projectId}/requirements/${requirementId}/designs-ai`;
    return this.post(path, body);
  }

  async generateAssertionsWithAI(projectId: string, testDesignId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> {
    const path = `/projects/${projectId}/test-designs/${testDesignId}/assertions-ai`;
    return this.post(path, body);
  }

  async generateExecutionPlanWithAI(projectId: string, requirementId: string, body: { providerId: string; previewOnly?: boolean }): Promise<any> {
    const path = `/projects/${projectId}/requirements/${requirementId}/execution-plans-ai`;
    return this.post(path, body);
  }

  async validateReadiness(projectId: string, requirementId: string): Promise<ValidationReport> {
    const path = `/projects/${projectId}/requirements/${requirementId}/validate`;
    return this.getCustom(path);
  }

  async planTestStrategy(projectId: string, requirementId: string): Promise<TestStrategy> {
    const path = `/projects/${projectId}/requirements/${requirementId}/strategy`;
    return this.post(path);
  }

  async generateTestDesigns(projectId: string, requirementId: string): Promise<TestDesign[]> {
    const path = `/projects/${projectId}/requirements/${requirementId}/designs`;
    return this.post(path);
  }

  async planExecution(projectId: string, requirementId: string): Promise<ExecutionPlan[]> {
    const path = `/projects/${projectId}/requirements/${requirementId}/execution-plans`;
    return this.post(path);
  }
}

export const requirementService = new RequirementService();

export default requirementService;