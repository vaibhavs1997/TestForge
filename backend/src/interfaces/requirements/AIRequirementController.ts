// AIRequirementController - Controller for AI-based Requirement generation endpoints
import { Request, Response } from 'express';
import { GenerateRequirementsWithAI } from '../../application/requirements/GenerateRequirementsWithAI.js';
import { GenerateTestStrategyWithAI } from '../../application/requirements/GenerateTestStrategyWithAI.js';
import { GenerateTestDesignWithAI } from '../../application/requirements/GenerateTestDesignWithAI.js';
import { GenerateAssertionsWithAI } from '../../application/assertion/GenerateAssertionsWithAI.js';
import { GenerateExecutionPlanWithAI } from '../../application/requirements/GenerateExecutionPlanWithAI.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class AIRequirementController {
    constructor(private readonly generateRequirementsWithAI: GenerateRequirementsWithAI, private readonly generateTestStrategyWithAI: GenerateTestStrategyWithAI, private readonly generateTestDesignWithAI: GenerateTestDesignWithAI, private readonly generateAssertionsUseCase: GenerateAssertionsWithAI, private readonly generateExecutionPlanWithAI: GenerateExecutionPlanWithAI) { }
    async generateWithAI(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { providerId, previewOnly } = req.body;
        if (!providerId) {
            throw new Error('providerId is required');
        }
        const result = await this.generateRequirementsWithAI.execute({
            projectId,
            providerId,
            previewOnly: !!previewOnly,
        });
        res.status(200).json(createSuccessResponse(result));
    }
    async generateStrategyWithAI(req: Request, res: Response): Promise<void> {
        const { projectId, requirementId } = req.params;
        const { providerId, previewOnly } = req.body;
        if (!providerId) {
            throw new Error('providerId is required');
        }
        const result = await this.generateTestStrategyWithAI.execute({
            projectId,
            requirementId,
            providerId,
            previewOnly: !!previewOnly,
        });
        res.status(200).json(createSuccessResponse(result));
    }
    async generateDesignWithAI(req: Request, res: Response): Promise<void> {
        const { projectId, requirementId } = req.params;
        const { providerId, previewOnly } = req.body;
        if (!providerId) {
            throw new Error('providerId is required');
        }
        const result = await this.generateTestDesignWithAI.execute({
            projectId,
            requirementId,
            providerId,
            previewOnly: !!previewOnly,
        });
        res.status(200).json(createSuccessResponse(result));
    }
    async generateExecutionPlanAI(req: Request, res: Response): Promise<void> {
        const { projectId, requirementId } = req.params;
        const { providerId, previewOnly } = req.body;
        if (!providerId) {
            throw new Error('providerId is required');
        }
        const result = await this.generateExecutionPlanWithAI.execute({
            projectId,
            requirementId,
            providerId,
            previewOnly: !!previewOnly,
        });
        res.status(200).json(createSuccessResponse(result));
    }
    async generateAssertionsWithAI(req: Request, res: Response): Promise<void> {
        const { projectId, testDesignId } = req.params;
        const { providerId, previewOnly } = req.body;
        if (!providerId) {
            throw new Error('providerId is required');
        }
        const result = await this.generateAssertionsUseCase.execute({
            projectId,
            testDesignId,
            providerId,
            previewOnly: !!previewOnly,
        });
        res.status(200).json(createSuccessResponse(result));
    }
}
export default AIRequirementController;

