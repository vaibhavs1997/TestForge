// RequirementController - Controller for Requirement Workspace endpoints
import { Request, Response } from 'express';
import { CreateRequirement } from '../../application/requirements/CreateRequirement';
import { UpdateRequirement } from '../../application/requirements/UpdateRequirement';
import { DeleteRequirement } from '../../application/requirements/DeleteRequirement';
import { GetRequirement } from '../../application/requirements/GetRequirement';
import { ListRequirements } from '../../application/requirements/ListRequirements';
import { GenerateFromAnalysis } from '../../application/requirements/GenerateFromAnalysis';
import { ValidateRequirementReadiness } from '../../application/requirements/ValidateRequirementReadiness';
import { PlanTestStrategy } from '../../application/requirements/PlanTestStrategy';
import { GenerateTestDesigns } from '../../application/requirements/GenerateTestDesigns';
import { PlanExecution } from '../../application/requirements/PlanExecution';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class RequirementController {
    constructor(private readonly createRequirementUseCase: CreateRequirement, private readonly updateRequirementUseCase: UpdateRequirement, private readonly deleteRequirementUseCase: DeleteRequirement, private readonly getRequirementUseCase: GetRequirement, private readonly listRequirementsUseCase: ListRequirements, private readonly generateFromAnalysisUseCase: GenerateFromAnalysis, private readonly validateRequirementReadinessUseCase: ValidateRequirementReadiness, private readonly planTestStrategyUseCase: PlanTestStrategy, private readonly generateTestDesignsUseCase: GenerateTestDesigns, private readonly planExecutionUseCase: PlanExecution) { }
    async listRequirements(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const approvalStatus = req.query.approvalStatus as string | undefined;
        const items = await this.listRequirementsUseCase.execute({ projectId, approvalStatus });
        res.status(200).json(createSuccessResponse(items));
    }
    async createRequirement(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { title, description, category, confidence, source, projectAnalysisId, reviewStatus, approvalStatus, relatedOperations, relatedFlows, relatedDatasets, acceptanceCriteria } = req.body;
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
        const { title, description, category, confidence, source, projectAnalysisId, reviewStatus, approvalStatus, relatedOperations, relatedFlows, relatedDatasets, acceptanceCriteria } = req.body;
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
        const designs = await this.generateTestDesignsUseCase.execute(requirementId);
        res.status(201).json(createSuccessResponse(designs));
    }
    async planExecution(req: Request, res: Response): Promise<void> {
        const { requirementId } = req.params;
        const plans = await this.planExecutionUseCase.execute(requirementId);
        res.status(201).json(createSuccessResponse(plans));
    }
}
export default RequirementController;

