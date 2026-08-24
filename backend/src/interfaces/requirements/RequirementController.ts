// RequirementController - Controller for Requirement Workspace endpoints
import { Request, Response } from 'express';
import { CreateRequirement } from '../../application/requirements/CreateRequirement.js';
import { UpdateRequirement } from '../../application/requirements/UpdateRequirement.js';
import { DeleteRequirement } from '../../application/requirements/DeleteRequirement.js';
import { GetRequirement } from '../../application/requirements/GetRequirement.js';
import { ListRequirements } from '../../application/requirements/ListRequirements.js';
import { GenerateFromAnalysis } from '../../application/requirements/GenerateFromAnalysis.js';
import { ValidateRequirementReadiness } from '../../application/requirements/ValidateRequirementReadiness.js';
import { PlanTestStrategy } from '../../application/requirements/PlanTestStrategy.js';
import { GenerateTestDesigns } from '../../application/requirements/GenerateTestDesigns.js';
import { PlanExecution } from '../../application/requirements/PlanExecution.js';
import { GenerateRequirementTestCases } from '../../application/requirements/GenerateRequirementTestCases.js';
import { ImportRequirementFromJira } from '../../application/requirements/ImportRequirementFromJira.js';
import { UpdateTestDesign } from '../../application/requirements/UpdateTestDesign.js';
import { GetRequirementMappingContext } from '../../application/requirements/GetRequirementMappingContext.js';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository.js';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
import type { DesignStatus, RequestOverride } from '../../domain/requirements/TestDesignEntity.js';
import type { ExecutionPlanStatus } from '../../domain/requirements/ExecutionPlanEntity.js';
import type { TestCaseVersionService } from '../../application/requirements/TestCaseVersionService.js';

export class RequirementController {
    constructor(
        private readonly createRequirementUseCase: CreateRequirement,
        private readonly updateRequirementUseCase: UpdateRequirement,
        private readonly deleteRequirementUseCase: DeleteRequirement,
        private readonly getRequirementUseCase: GetRequirement,
        private readonly listRequirementsUseCase: ListRequirements,
        private readonly generateFromAnalysisUseCase: GenerateFromAnalysis,
        private readonly validateRequirementReadinessUseCase: ValidateRequirementReadiness,
        private readonly planTestStrategyUseCase: PlanTestStrategy,
        private readonly generateTestDesignsUseCase: GenerateTestDesigns,
        private readonly planExecutionUseCase: PlanExecution,
        private readonly generateRequirementTestCasesUseCase: GenerateRequirementTestCases,
        private readonly importRequirementFromJiraUseCase: ImportRequirementFromJira,
        private readonly updateTestDesignUseCase: UpdateTestDesign,
        private readonly getRequirementMappingContextUseCase: GetRequirementMappingContext,
        private readonly testDesignRepository: TestDesignRepository,
        private readonly executionPlanRepository: ExecutionPlanRepository,
        private readonly testCaseVersionService?: TestCaseVersionService,
    ) { }
    async listRequirements(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const approvalStatus = req.query.approvalStatus as string | undefined;
        const items = await this.listRequirementsUseCase.execute({ projectId, approvalStatus });
        res.status(200).json(createSuccessResponse(items));
    }
    async createRequirement(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { title, description, category, confidence, source, projectAnalysisId, reviewStatus, approvalStatus, relatedOperations, relatedFlows, relatedDatasets, acceptanceCriteria, jiraIssueKey, generationPending, generationExpiresAt } = req.body;
        const requirement = await this.createRequirementUseCase.execute({
            projectId,
            title,
            description,
            category,
            confidence,
            source,
            projectAnalysisId,
            reviewStatus,
            approvalStatus,
            relatedOperations,
            relatedFlows,
            relatedDatasets,
            acceptanceCriteria,
            jiraIssueKey,
            generationPending,
            generationExpiresAt,
        });
        res.status(201).json(createSuccessResponse(requirement));
    }
    async getRequirement(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const requirement = await this.getRequirementUseCase.execute(requirementId);
        res.status(200).json(createSuccessResponse(requirement));
    }
    async updateRequirement(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const { title, description, category, confidence, source, projectAnalysisId, reviewStatus, approvalStatus, relatedOperations, relatedFlows, relatedDatasets, acceptanceCriteria, jiraIssueKey } = req.body;
        const requirement = await this.updateRequirementUseCase.execute({
            id: requirementId,
            title,
            description,
            category,
            confidence,
            source,
            projectAnalysisId,
            reviewStatus,
            approvalStatus,
            relatedOperations,
            relatedFlows,
            relatedDatasets,
            acceptanceCriteria,
            jiraIssueKey,
        });
        res.status(200).json(createSuccessResponse(requirement));
    }
    async deleteRequirement(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        await this.deleteRequirementUseCase.execute(requirementId);
        res.status(204).send();
    }
    async generateFromAnalysis(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { analysisId } = req.params;
        const requirements = await this.generateFromAnalysisUseCase.execute(projectId, analysisId);
        res.status(201).json(createSuccessResponse(requirements));
    }
    async validateReadiness(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const report = await this.validateRequirementReadinessUseCase.execute(requirementId);
        res.status(200).json(createSuccessResponse(report));
    }
    async planTestStrategy(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const strategy = await this.planTestStrategyUseCase.execute(requirementId);
        res.status(201).json(createSuccessResponse(strategy));
    }
    async generateTestDesigns(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const designs = await this.generateTestDesignsUseCase.execute(requirementId, { budget: req.body?.budget });
        res.status(201).json(createSuccessResponse(designs));
    }
    async generateTestCases(req: Request, res: Response): Promise<void> {
        const { projectId, requirementId } = req.params;
        const { providerId, useAi, buildRunPlan, replaceExisting, budget } = req.body ?? {};
        const result = await this.generateRequirementTestCasesUseCase.execute({
            projectId,
            requirementId,
            providerId,
            useAi: Boolean(useAi),
            buildRunPlan: Boolean(buildRunPlan),
            replaceExisting: replaceExisting !== false,
            budget,
        });
        res.status(201).json(createSuccessResponse(result));
    }
    async coverage(req: Request, res: Response): Promise<void> {
        if (!this.testCaseVersionService) throw new Error('Coverage service is unavailable');
        const requirement = await this.getRequirementUseCase.execute(req.params.requirementId);
        const scope = {
            acceptanceCriteriaIds: (requirement.acceptanceCriteria || []).map((criterion: any) => criterion.id),
            operationIds: requirement.relatedOperations?.length ? requirement.relatedOperations : undefined,
        };
        res.status(200).json(createSuccessResponse(this.testCaseVersionService.coverage(req.params.projectId, scope)));
    }
    async planExecution(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const plans = await this.planExecutionUseCase.execute(requirementId);
        res.status(201).json(createSuccessResponse(plans));
    }
    async listTestDesigns(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const designs = await this.testDesignRepository.findByRequirement(requirementId);
        res.status(200).json(createSuccessResponse(designs));
    }
    async updateTestDesign(req: Request, res: Response): Promise<void> {
        const { testDesignId } = req.params;
        const { status, operationId, requestOverrides, rebuildPayload } = req.body as {
            status?: DesignStatus;
            operationId?: string;
            requestOverrides?: RequestOverride;
            rebuildPayload?: boolean;
        };
        const design = await this.updateTestDesignUseCase.execute({
            testDesignId,
            status,
            operationId,
            requestOverrides,
            rebuildPayload,
        });
        res.status(200).json(createSuccessResponse(design));
    }
    async getMappingContext(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const context = await this.getRequirementMappingContextUseCase.execute(requirementId);
        res.status(200).json(createSuccessResponse(context));
    }
    async listExecutionPlansForRequirement(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const plans = await this.executionPlanRepository.findByRequirement(requirementId);
        res.status(200).json(createSuccessResponse(plans));
    }
    async updateExecutionPlan(req: Request, res: Response): Promise<void> {
        const { executionPlanId } = req.params;
        const { status } = req.body as { status?: ExecutionPlanStatus };
        if (!status || !['Pending', 'Ready', 'Disabled'].includes(status)) {
            throw new Error('Invalid status. Must be Pending, Ready, or Disabled');
        }
        const plan = await this.executionPlanRepository.update(executionPlanId, { status });
        res.status(200).json(createSuccessResponse(plan));
    }
    async importFromJira(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { issueKey } = req.body as { issueKey?: string };
        if (!issueKey?.trim()) {
            throw new Error('issueKey is required');
        }
        const requirement = await this.importRequirementFromJiraUseCase.execute({
            projectId,
            issueKey: issueKey.trim(),
        });
        res.status(201).json(createSuccessResponse(requirement));
    }
}
export default RequirementController;

