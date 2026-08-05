// PromptController - Controller for Prompt Builder endpoints
import { Request, Response } from 'express';
import { PromptBuilderService } from '../../application/prompt/PromptBuilderService';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class PromptController {
  constructor(private readonly promptBuilderService: PromptBuilderService) {}

  // GET /api/projects/:projectId/prompts
  async listPrompts(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const prompts = await this.promptBuilderService.listPrompts(projectId);
      res.status(200).json(createSuccessResponse(prompts));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  // GET /api/projects/:projectId/prompts/templates
  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const templates = await this.promptBuilderService.listTemplates(projectId);
      res.status(200).json(createSuccessResponse(templates));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  // POST /api/projects/:projectId/prompts/build
  async buildPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { templateId, customVariables, createdBy } = req.body;
      if (!templateId) {
        res.status(400).json(createErrorResponse('templateId is required', 'VALIDATION_ERROR'));
        return;
      }
      const prompt = await this.promptBuilderService.buildPrompt({
        templateId,
        projectId,
        customVariables,
        createdBy,
      });
      res.status(201).json(createSuccessResponse(prompt));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  // POST /api/projects/:projectId/prompts/preview
  async previewPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { templateId, systemPromptOverride, userPromptOverride, variableOverrides } = req.body;
      if (!templateId) {
        res.status(400).json(createErrorResponse('templateId is required', 'VALIDATION_ERROR'));
        return;
      }
      const preview = await this.promptBuilderService.previewPrompt({
        templateId,
        projectId,
        systemPromptOverride,
        userPromptOverride,
        variableOverrides,
      });
      res.status(200).json(createSuccessResponse(preview));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  // GET /api/projects/:projectId/prompts/:promptId
  async getPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { promptId } = req.params;
      const prompt = await this.promptBuilderService.getPrompt(promptId);
      res.status(200).json(createSuccessResponse(prompt));
    } catch (error: any) {
      res.status(404).json(createErrorResponse(error.message || 'Not Found', 'NOT_FOUND'));
    }
  }

  // DELETE /api/projects/:projectId/prompts/:promptId
  async deletePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { promptId } = req.params;
      await this.promptBuilderService.deletePrompt(promptId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default PromptController;
