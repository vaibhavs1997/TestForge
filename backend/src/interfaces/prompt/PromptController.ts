// PromptController - Controller for Prompt Builder endpoints
import { Request, Response } from 'express';
import { PromptBuilderService } from '../../application/prompt/PromptBuilderService';

export class PromptController {
  constructor(private readonly promptBuilderService: PromptBuilderService) {}

  // GET /api/projects/:projectId/prompts
  async listPrompts(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const prompts = await this.promptBuilderService.listPrompts(projectId);
      res.status(200).json({ success: true, data: prompts });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  // GET /api/projects/:projectId/prompts/templates
  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const templates = await this.promptBuilderService.listTemplates(projectId);
      res.status(200).json({ success: true, data: templates });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  // POST /api/projects/:projectId/prompts/build
  async buildPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { templateId, customVariables, createdBy } = req.body;
      if (!templateId) {
        res.status(400).json({ success: false, message: 'templateId is required', details: null });
        return;
      }
      const prompt = await this.promptBuilderService.buildPrompt({
        templateId,
        projectId,
        customVariables,
        createdBy,
      });
      res.status(201).json({ success: true, data: prompt });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  // POST /api/projects/:projectId/prompts/preview
  async previewPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { templateId, systemPromptOverride, userPromptOverride, variableOverrides } = req.body;
      if (!templateId) {
        res.status(400).json({ success: false, message: 'templateId is required', details: null });
        return;
      }
      const preview = await this.promptBuilderService.previewPrompt({
        templateId,
        projectId,
        systemPromptOverride,
        userPromptOverride,
        variableOverrides,
      });
      res.status(200).json({ success: true, data: preview });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  // GET /api/projects/:projectId/prompts/:promptId
  async getPrompt(req: Request, res: Response): Promise<void> {
    try {
      const { promptId } = req.params;
      const prompt = await this.promptBuilderService.getPrompt(promptId);
      res.status(200).json({ success: true, data: prompt });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || 'Not Found', details: null });
    }
  }

  // DELETE /api/projects/:projectId/prompts/:promptId
  async deletePrompt(req: Request, res: Response): Promise<void> {
    try {
      const { promptId } = req.params;
      await this.promptBuilderService.deletePrompt(promptId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default PromptController;
