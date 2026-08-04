// RunAIPipeline - AI Pipeline Orchestrator
// Executes the complete AI workflow by reusing existing AI generation use cases.
// Does NOT implement any new framework. Stop-on-failure semantics.

import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { GenerateRequirementsWithAI } from '../requirements/GenerateRequirementsWithAI';
import { GenerateTestStrategyWithAI } from '../requirements/GenerateTestStrategyWithAI';
import { GenerateTestDesignWithAI } from '../requirements/GenerateTestDesignWithAI';
import { GenerateAssertionsWithAI } from '../assertion/GenerateAssertionsWithAI';
import { GenerateExecutionPlanWithAI } from '../requirements/GenerateExecutionPlanWithAI';
import { GenerateTestSuiteWithAI } from '../suite/GenerateTestSuiteWithAI';

export interface RunAIPipelineRequest {
  projectId: string;
  providerId: string;
  autoApprove?: boolean;
}

export type AIPipelineStageStatus = 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Skipped';

export interface AIPipelineStageResult {
  stage: string;
  status: AIPipelineStageStatus;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  warnings: string[];
  generatedCount: number;
  artifactIds: string[];
  error?: string;
}

export interface RunAIPipelineResult {
  projectId: string;
  providerId: string;
  autoApprove: boolean;
  startedAt: number;
  completedAt: number;
  totalDurationMs: number;
  status: 'Completed' | 'Failed' | 'Partial';
  stages: AIPipelineStageResult[];
  requirementIds: string[];
  strategyIds: string[];
  designIds: string[];
  assertionIds: string[];
  executionPlanIds: string[];
  suiteIds: string[];
  warnings: string[];
  error?: string;
}

export class RunAIPipeline {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly generateRequirementsWithAI: GenerateRequirementsWithAI,
    private readonly generateTestStrategyWithAI: GenerateTestStrategyWithAI,
    private readonly generateTestDesignWithAI: GenerateTestDesignWithAI,
    private readonly generateAssertionsWithAI: GenerateAssertionsWithAI,
    private readonly generateExecutionPlanWithAI: GenerateExecutionPlanWithAI,
    private readonly generateTestSuiteWithAI: GenerateTestSuiteWithAI
  ) {}

  async execute(request: RunAIPipelineRequest): Promise<RunAIPipelineResult> {
    const startedAt = Date.now();
    const warnings: string[] = [];
    const stages: AIPipelineStageResult[] = [];

    const result: RunAIPipelineResult = {
      projectId: request.projectId,
      providerId: request.providerId,
      autoApprove: !!request.autoApprove,
      startedAt,
      completedAt: 0,
      totalDurationMs: 0,
      status: 'Completed',
      stages,
      requirementIds: [],
      strategyIds: [],
      designIds: [],
      assertionIds: [],
      executionPlanIds: [],
      suiteIds: [],
      warnings,
    };

    // 1. Validate project readiness
    const projectReady = await this.validateProjectReadiness(request.projectId);
    warnings.push(...projectReady.warnings);
    if (!projectReady.ready) {
      result.status = 'Failed';
      result.completedAt = Date.now();
      result.totalDurationMs = result.completedAt - startedAt;
      result.error = 'Project is not ready for AI pipeline. Missing required project context.';
      return result;
    }

    // 2. Validate AI provider (resolve through ManageAIProviders)
    const providerResult = await this.validateProvider(request.providerId);
    warnings.push(...providerResult.warnings);
    if (!providerResult.valid) {
      result.status = 'Failed';
      result.completedAt = Date.now();
      result.totalDurationMs = result.completedAt - startedAt;
      result.error = providerResult.error;
      return result;
    }

    // 3. Generate Requirements
    const reqStage = await this.runStage(
      'Requirements',
      async () => {
        const res = await this.generateRequirementsWithAI.execute({
          projectId: request.projectId,
          providerId: request.providerId,
        });
        const ids = (res.requirements || []).map(r => r.id);
        result.requirementIds.push(...ids);

        // 4. Auto approve (optional flag)
        if (request.autoApprove) {
          for (const req of res.requirements || []) {
            try {
              await this.requirementRepository.update(req.id, { approvalStatus: 'Approved' });
            } catch {
              // best-effort auto-approve
            }
          }
        }
        return ids;
      }
    );
    stages.push(reqStage);
    if (reqStage.status === 'Failed') return this.finalizePartial(result, startedAt, stages, warnings, reqStage.error);

    // 5. Generate Test Strategies
    const strategyStage = await this.runStage(
      'Strategy',
      async () => {
        const ids: string[] = [];
        for (const requirementId of result.requirementIds) {
          const res = await this.generateTestStrategyWithAI.execute({
            projectId: request.projectId,
            requirementId,
            providerId: request.providerId,
          });
          if (res.strategy) {
            ids.push(res.strategy.id);
            result.strategyIds.push(res.strategy.id);
          }
        }
        return ids;
      }
    );
    stages.push(strategyStage);
    if (strategyStage.status === 'Failed') return this.finalizePartial(result, startedAt, stages, warnings, strategyStage.error);

    // 6. Generate Test Designs
    const designStage = await this.runStage(
      'Design',
      async () => {
        const ids: string[] = [];
        for (const requirementId of result.requirementIds) {
          const res = await this.generateTestDesignWithAI.execute({
            projectId: request.projectId,
            requirementId,
            providerId: request.providerId,
          });
          for (const design of res.designs || []) {
            ids.push(design.id);
            result.designIds.push(design.id);
          }
        }
        return ids;
      }
    );
    stages.push(designStage);
    if (designStage.status === 'Failed') return this.finalizePartial(result, startedAt, stages, warnings, designStage.error);

    // 7. Generate Assertions (per test design)
    const assertionStage = await this.runStage(
      'Assertions',
      async () => {
        const ids: string[] = [];
        for (const designId of result.designIds) {
          const res = await this.generateAssertionsWithAI.execute({
            projectId: request.projectId,
            testDesignId: designId,
            providerId: request.providerId,
          });
          for (const assertion of res.assertions || []) {
            ids.push(assertion.id);
            result.assertionIds.push(assertion.id);
          }
        }
        return ids;
      }
    );
    stages.push(assertionStage);
    if (assertionStage.status === 'Failed') return this.finalizePartial(result, startedAt, stages, warnings, assertionStage.error);

    // 8. Generate Execution Plans
    const executionStage = await this.runStage(
      'Execution Plans',
      async () => {
        const ids: string[] = [];
        for (const requirementId of result.requirementIds) {
          const res = await this.generateExecutionPlanWithAI.execute({
            projectId: request.projectId,
            requirementId,
            providerId: request.providerId,
          });
          for (const plan of res.plans || []) {
            ids.push(plan.id);
            result.executionPlanIds.push(plan.id);
          }
        }
        return ids;
      }
    );
    stages.push(executionStage);
    if (executionStage.status === 'Failed') return this.finalizePartial(result, startedAt, stages, warnings, executionStage.error);

    // 9. Generate Test Suites
    const suiteStage = await this.runStage(
      'Suites',
      async () => {
        const res = await this.generateTestSuiteWithAI.execute({
          projectId: request.projectId,
          providerId: request.providerId,
        });
        const ids = (res.suites || []).map(s => s.id);
        result.suiteIds.push(...ids);
        return ids;
      }
    );
    stages.push(suiteStage);
    if (suiteStage.status === 'Failed') return this.finalizePartial(result, startedAt, stages, warnings, suiteStage.error);

    // 10. Return complete summary
    result.status = 'Completed';
    result.completedAt = Date.now();
    result.totalDurationMs = result.completedAt - startedAt;
    result.warnings = warnings;
    result.stages = stages;
    return result;
  }

  private async validateProjectReadiness(projectId: string): Promise<{ ready: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    const requirements = await this.requirementRepository.findByProject(projectId);
    // Project is considered ready if at least an API/analysis/requirement context can be built.
    // We rely on ProjectContextService inside the sub-use-cases; here we treat missing requirements
    // as a warning but still allow AI generation (the sub-use-cases have their own fallbacks).
    if (!requirements || requirements.length === 0) {
      warnings.push('No requirements found yet. Project readiness is partial; AI generation will proceed with context-derived fallbacks.');
    }
    return { ready: true, warnings };
  }

  private async validateProvider(providerId: string): Promise<{ valid: boolean; warnings: string[]; error?: string }> {
    const warnings: string[] = [];
    if (!providerId) {
      return { valid: false, warnings, error: 'AI Provider is required.' };
    }
    // Resolution happens inside each sub-use-case via ManageAIProviders.getProvider.
    // We proactively check it here by invoking a lightweight requirement generation validation.
    // To avoid double work and keep reuse clean, we only verify a provider exists by calling
    // the requirements use case in preview mode (which resolves the provider without persisting).
    try {
      const preview = await this.generateRequirementsWithAI.execute({
        projectId: 'default',
        providerId,
        previewOnly: true,
      });
      if (!preview.providerUsed) {
        return { valid: false, warnings, error: 'AI Provider could not be resolved.' };
      }
    } catch (err: any) {
      return { valid: false, warnings, error: err.message || 'AI Provider could not be resolved.' };
    }
    return { valid: true, warnings };
  }

  private async runStage(
    stage: string,
    fn: () => Promise<string[]>
  ): Promise<AIPipelineStageResult> {
    const startedAt = Date.now();
    try {
      const ids = await fn();
      return {
        stage,
        status: 'Completed',
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        warnings: [],
        generatedCount: ids.length,
        artifactIds: ids,
      };
    } catch (error: any) {
      return {
        stage,
        status: 'Failed',
        startedAt,
        completedAt: Date.now(),
        durationMs: Date.now() - startedAt,
        warnings: [error?.message || 'Unknown error'],
        generatedCount: 0,
        artifactIds: [],
        error: error?.message || 'Unknown error',
      };
    }
  }

  private finalizePartial(
    result: RunAIPipelineResult,
    startedAt: number,
    stages: AIPipelineStageResult[],
    warnings: string[],
    error?: string
  ): RunAIPipelineResult {
    // Mark remaining stages as Skipped
    const stageNames = ['Requirements', 'Strategy', 'Design', 'Assertions', 'Execution Plans', 'Suites'];
    const running = new Set(stages.map(s => s.stage));
    for (const name of stageNames) {
      if (!running.has(name)) {
        stages.push({
          stage: name,
          status: 'Skipped',
          startedAt: 0,
          completedAt: 0,
          durationMs: 0,
          warnings: [],
          generatedCount: 0,
          artifactIds: [],
        });
      }
    }
    result.status = 'Partial';
    result.completedAt = Date.now();
    result.totalDurationMs = result.completedAt - startedAt;
    result.warnings = warnings;
    result.stages = stages;
    result.error = error;
    return result;
  }
}

export default RunAIPipeline;