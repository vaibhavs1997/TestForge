// AIRequirementController - Controller for AI-based Requirement generation endpoints
import { Request, Response } from 'express';
import { GenerateRequirementsWithAI } from '../../application/requirements/GenerateRequirementsWithAI';
import { GenerateTestStrategyWithAI } from '../../application/requirements/GenerateTestStrategyWithAI';
import { GenerateTestDesignWithAI } from '../../application/requirements/GenerateTestDesignWithAI';
import { GenerateAssertionsWithAI } from '../../application/assertion/GenerateAssertionsWithAI';
import { GenerateExecutionPlanWithAI } from '../../application/requirements/GenerateExecutionPlanWithAI';

export class AIRequirementController {
  constructor(
    private readonly generateRequirementsWithAI: GenerateRequirementsWithAI,
    private readonly generateTestStrategyWithAI: GenerateTestStrategyWithAI,
    private readonly generateTestDesignWithAI: GenerateTestDesignWithAI,
    private readonly generateAssertionsUseCase: GenerateAssertionsWithAI,
    private readonly generateExecutionPlanWithAI: GenerateExecutionPlanWithAI
  ) {}

  async generateWithAI(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { providerId, previewOnly } = req.body;

      if (!providerId) {
        res.status(400).json({ success: false, message: 'providerId is required', details: null });
        return;
      }

      const result = await this.generateRequirementsWithAI.execute({
        projectId,
        providerId,
        previewOnly: !!previewOnly,
      });

      res.status(200).json({
        success: true,
        data: result,
        warnings: result.warnings,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('could not be resolved')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async generateStrategyWithAI(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, requirementId } = req.params;
      const { providerId, previewOnly } = req.body;

      if (!providerId) {
        res.status(400).json({ success: false, message: 'providerId is required', details: null });
        return;
      }

      const result = await this.generateTestStrategyWithAI.execute({
        projectId,
        requirementId,
        providerId,
        previewOnly: !!previewOnly,
      });

      res.status(200).json({
        success: true,
        data: result,
        warnings: result.warnings,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('could not be resolved')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
  async generateDesignWithAI(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, requirementId } = req.params;
      const { providerId, previewOnly } = req.body;

      if (!providerId) {
        res.status(400).json({ success: false, message: 'providerId is required', details: null });
        return;
      }

      const result = await this.generateTestDesignWithAI.execute({
        projectId,
        requirementId,
        providerId,
        previewOnly: !!previewOnly,
      });

      res.status(200).json({
        success: true,
        data: result,
        warnings: result.warnings,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('could not be resolved')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async generateExecutionPlanAI(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, requirementId } = req.params;
      const { providerId, previewOnly } = req.body;

      if (!providerId) {
        res.status(400).json({ success: false, message: 'providerId is required', details: null });
        return;
      }

      const result = await this.generateExecutionPlanWithAI.execute({
        projectId,
        requirementId,
        providerId,
        previewOnly: !!previewOnly,
      });

      res.status(200).json({
        success: true,
        data: result,
        warnings: result.warnings,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('could not be resolved')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async generateAssertionsWithAI(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, testDesignId } = req.params;
      const { providerId, previewOnly } = req.body;

      if (!providerId) {
        res.status(400).json({ success: false, message: 'providerId is required', details: null });
        return;
      }

      const result = await this.generateAssertionsUseCase.execute({
        projectId,
        testDesignId,
        providerId,
        previewOnly: !!previewOnly,
      });

      res.status(200).json({
        success: true,
        data: result,
        warnings: result.warnings,
      });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('could not be resolved')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default AIRequirementController;
