// PromptController - Controller for Prompt Builder endpoints
import { Request, Response } from 'express';
import { PromptBuilderService } from '../../application/prompt/PromptBuilderService.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class PromptController {
    constructor(private readonly promptBuilderService: PromptBuilderService) { }
    // GET /api/projects/:projectId/prompts
    async listPrompts(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const prompts = await this.promptBuilderService.listPrompts(projectId);
        res.status(200).json(createSuccessResponse(prompts));
    }
    // GET /api/projects/:projectId/prompts/templates
    async listTemplates(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const templates = await this.promptBuilderService.listTemplates(projectId);
        res.status(200).json(createSuccessResponse(templates));
    }
    // POST /api/projects/:projectId/prompts/build
    async buildPrompt(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { templateId, customVariables, createdBy } = req.body;
        if (!templateId) {
            throw new Error('templateId is required');
        }
        const prompt = await this.promptBuilderService.buildPrompt({
            templateId,
            projectId,
            customVariables,
            createdBy,
        });
        res.status(201).json(createSuccessResponse(prompt));
    }
    // POST /api/projects/:projectId/prompts/preview
    async previewPrompt(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { templateId, systemPromptOverride, userPromptOverride, variableOverrides } = req.body;
        if (!templateId) {
            throw new Error('templateId is required');
        }
        const preview = await this.promptBuilderService.previewPrompt({
            templateId,
            projectId,
            systemPromptOverride,
            userPromptOverride,
            variableOverrides,
        });
        res.status(200).json(createSuccessResponse(preview));
    }
    // GET /api/projects/:projectId/prompts/:promptId
    async getPrompt(req: Request, res: Response): Promise<void> {
        const { promptId } = req.params;
        const prompt = await this.promptBuilderService.getPrompt(promptId);
        res.status(200).json(createSuccessResponse(prompt));
    }
    // DELETE /api/projects/:projectId/prompts/:promptId
    async deletePrompt(req: Request, res: Response): Promise<void> {
        const { promptId } = req.params;
        await this.promptBuilderService.deletePrompt(promptId);
        res.status(204).send();
    }
}
export default PromptController;

