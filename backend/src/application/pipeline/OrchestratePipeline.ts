// OrchestratePipeline - Pipeline Orchestrator Service
// Coordinates the existing deterministic workflow by invoking existing modules in sequence.
// Does NOT replace any existing implementation.
import { randomUUID } from 'node:crypto';
import { PipelineRepository } from '../../domain/pipeline/PipelineRepository';
import { PipelineEntity, PipelineStage, PipelineStatus, StageResult } from '../../domain/pipeline/PipelineEntity';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity';

// Existing use cases - reusing, NOT duplicating
import { CreateAnalysis } from '../analysis/CreateAnalysis';
import { GenerateFromAnalysis } from '../requirements/GenerateFromAnalysis';
import { ValidateRequirementReadiness } from '../requirements/ValidateRequirementReadiness';
import { PlanTestStrategy } from '../requirements/PlanTestStrategy';
import { GenerateTestDesigns } from '../requirements/GenerateTestDesigns';
import { PlanExecution } from '../requirements/PlanExecution';

export class OrchestratePipeline {
  constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly requirementRepository: RequirementRepository,
    private readonly analysisRepository: AnalysisRepository,
    private readonly knowledgeFlowRepository: KnowledgeFlowRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository
  ) {}

  async execute(projectId: string): Promise<PipelineEntity> {
    // Create new pipeline
    const pipeline = this.createPipeline(projectId);
    await this.pipelineRepository.create(pipeline);

    try {
      // Execute each stage sequentially
      for (const stage of this.getStageOrder()) {
        await this.executeStage(pipeline, stage);
      }
    } catch (error) {
      // Mark pipeline as failed if any stage fails
      const currentStage = pipeline.currentStage;
      await this.pipelineRepository.update(pipeline.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update the failed stage
      const stages = pipeline.stages.map(s => {
        if (s.stage === currentStage) {
          return {
            ...s,
            status: 'failed' as PipelineStatus,
            completedAt: Date.now(),
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
        return s;
      });

      await this.pipelineRepository.update(pipeline.id, { stages });
      throw error;
    }

    return pipeline;
  }

  async restartStage(pipelineId: string, stage: PipelineStage): Promise<PipelineEntity> {
    const pipeline = await this.pipelineRepository.findById(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline with id ${pipelineId} not found`);
    }

    // Reset the stage and all subsequent stages
    const stages = pipeline.stages.map(s => {
      if (s.stage === stage) {
        return {
          stage: s.stage,
          status: 'pending' as PipelineStatus,
          startedAt: null,
          completedAt: null,
          error: null,
          artifacts: null
        };
      }
      return s;
    });

    const stageIndex = this.getStageOrder().indexOf(stage);
    const remainingStages = this.getStageOrder().slice(stageIndex + 1);

    // Reset subsequent stages
    for (const remainingStage of remainingStages) {
      const existingStage = stages.find(s => s.stage === remainingStage);
      if (existingStage) {
        existingStage.status = 'pending';
        existingStage.startedAt = null;
        existingStage.completedAt = null;
        existingStage.error = null;
        existingStage.artifacts = null;
      }
    }

    await this.pipelineRepository.update(pipelineId, {
      stages,
      status: 'running',
      currentStage: stage,
      error: null
    });

    // Execute from the specified stage
    try {
      const updatedPipeline = await this.pipelineRepository.findById(pipelineId);
      if (!updatedPipeline) throw new Error('Pipeline not found');
      await this.executeStage(updatedPipeline, stage);

      // Continue with subsequent stages
      for (const nextStage of remainingStages) {
        const currentPipeline = await this.pipelineRepository.findById(pipelineId);
        if (!currentPipeline) throw new Error('Pipeline not found');
        await this.executeStage(currentPipeline, nextStage);
      }
    } catch (error) {
      await this.pipelineRepository.update(pipelineId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }

    const finalPipeline = await this.pipelineRepository.findById(pipelineId);
    if (!finalPipeline) throw new Error('Pipeline not found');
    return finalPipeline;
  }

  async cancelPipeline(pipelineId: string): Promise<PipelineEntity | null> {
    const pipeline = await this.pipelineRepository.findById(pipelineId);
    if (!pipeline) return null;

    return this.pipelineRepository.update(pipelineId, {
      status: 'cancelled',
      completedAt: Date.now()
    });
  }

  private createPipeline(projectId: string): PipelineEntity {
    const stages = this.getStageOrder().map(stage => ({
      stage,
      status: 'pending' as PipelineStatus,
      startedAt: null,
      completedAt: null,
      error: null,
      artifacts: null
    }));

    return new PipelineEntity(
      randomUUID(),
      projectId,
      this.getStageOrder()[0],
      'pending',
      stages,
      Date.now(),
      null,
      null
    );
  }

  private async executeStage(pipeline: PipelineEntity, stage: PipelineStage): Promise<void> {
    const stageResult = await this.runStage(pipeline.projectId, stage);
    await this.pipelineRepository.updateStage(pipeline.id, stageResult);
  }

  private async runStage(projectId: string, stage: PipelineStage): Promise<StageResult> {
    const startedAt = Date.now();

    try {
      let artifacts: Record<string, unknown> = {};

      switch (stage) {
        case 'API Import':
          // API Import is handled via existing endpoints - just mark as complete
          break;

        case 'Environment Detection':
          // Environment detection is handled via existing endpoints
          const environments = await this.environmentRepository.findByProject(projectId);
          artifacts = { count: environments.length };
          break;

        case 'Project Analysis':
          // Create a default analysis if none exists
          const existingAnalyses = await this.analysisRepository.findByProject(projectId);
          if (existingAnalyses.length === 0) {
            const createAnalysis = new CreateAnalysis(this.analysisRepository);
            const analysis = await createAnalysis.execute({
              projectId,
              title: 'Auto-generated Analysis',
              status: 'Pending'
            });
            artifacts = { analysisId: analysis.id };
          } else {
            artifacts = { analysisId: existingAnalyses[0].id };
          }
          break;

        case 'Requirement Generation': {
          const analysis = await this.getLatestAnalysis(projectId);
          if (analysis) {
            const generateFromAnalysis = new GenerateFromAnalysis(
              this.requirementRepository,
              this.analysisRepository
            );
            const requirements = await generateFromAnalysis.execute(projectId, analysis.id);
            artifacts = { count: requirements.length };
          }
          break;
        }

        case 'Requirement Readiness Validation': {
          const requirementsForValidation = await this.requirementRepository.findByProject(projectId);
          const validateRequirementReadiness = new ValidateRequirementReadiness(
            this.requirementRepository,
            this.analysisRepository,
            this.knowledgeFlowRepository,
            this.datasetRepository,
            this.environmentRepository,
            this.apiServiceRepository,
            this.apiOperationRepository
          );

          for (const req of requirementsForValidation) {
            if (req.approvalStatus === 'Pending') {
              await validateRequirementReadiness.execute(req.id);
            }
          }
          artifacts = { validated: requirementsForValidation.length };
          break;
        }

        case 'Test Strategy': {
          const requirementsForStrategy = await this.requirementRepository.findByProject(projectId);
          const approvedRequirements = requirementsForStrategy.filter(r => r.approvalStatus === 'Approved');
          const planTestStrategy = new PlanTestStrategy(
            this.requirementRepository,
            this.analysisRepository,
            this.knowledgeFlowRepository,
            this.apiOperationRepository,
            this.testStrategyRepository
          );

          for (const req of approvedRequirements) {
            try {
              const strategy = await planTestStrategy.execute(req.id);
              artifacts = { ...artifacts, [req.id]: strategy.id };
            } catch (e) {
              // Skip if strategy already exists
            }
          }
          break;
        }

        case 'Test Design': {
          const testStrategies = await this.testStrategyRepository.findByProject(projectId);
          const generateTestDesigns = new GenerateTestDesigns(
            this.requirementRepository,
            this.testStrategyRepository,
            this.testDesignRepository,
            this.analysisRepository,
            this.knowledgeFlowRepository,
            this.datasetRepository,
            this.environmentRepository,
            this.apiOperationRepository
          );

          for (const strategy of testStrategies) {
            try {
              const designs = await generateTestDesigns.execute(strategy.requirementId);
              artifacts = { ...artifacts, [strategy.requirementId]: designs.length };
            } catch (e) {
              // Skip if designs already exist
            }
          }
          break;
        }

        case 'Execution Planning': {
          const executionRequirements = await this.requirementRepository.findByProject(projectId);
          const approvedForExecution = executionRequirements.filter(r => r.approvalStatus === 'Approved');
          const planExecution = new PlanExecution(
            this.requirementRepository,
            this.testDesignRepository,
            this.executionPlanRepository,
            this.knowledgeFlowRepository,
            this.apiOperationRepository
          );

          for (const req of approvedForExecution) {
            try {
              const plans = await planExecution.execute(req.id);
              artifacts = { ...artifacts, [req.id]: plans.length };
            } catch (e) {
              // Skip if plan already exists
            }
          }
          break;
        }

        default:
          throw new Error(`Unknown stage: ${stage}`);
      }

      return {
        stage,
        status: 'completed',
        startedAt,
        completedAt: Date.now(),
        error: null,
        artifacts
      };
    } catch (error) {
      return {
        stage,
        status: 'failed',
        startedAt,
        completedAt: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
        artifacts: null
      };
    }
  }

  private getStageOrder(): PipelineStage[] {
    return [
      'API Import',
      'Environment Detection',
      'Project Analysis',
      'Requirement Generation',
      'Requirement Readiness Validation',
      'Test Strategy',
      'Test Design',
      'Execution Planning'
    ];
  }

  private async getLatestAnalysis(projectId: string): Promise<AnalysisEntity | null> {
    const analyses = await this.analysisRepository.findByProject(projectId);
    if (analyses.length === 0) return null;
    return analyses.sort((a, b) => b.createdAt - a.createdAt)[0];
  }
}

export default OrchestratePipeline;