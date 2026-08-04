// TestSuiteController - Controller for Test Suite Management endpoints
import { Request, Response } from 'express';
import { ManageTestSuites } from '../../application/suite/ManageTestSuites';
import { GenerateTestSuiteWithAI } from '../../application/suite/GenerateTestSuiteWithAI';

export class TestSuiteController {
  constructor(
    private readonly manageTestSuites: ManageTestSuites,
    private readonly generateTestSuiteWithAI: GenerateTestSuiteWithAI
  ) {}

  async listSuites(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const items = await this.manageTestSuites.list(projectId);
      res.status(200).json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createSuite(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { name, description, tags, executionPlans, defaultEnvironmentId, executionPolicy, estimatedDuration, status } = req.body;

      const suite = await this.manageTestSuites.create({
        projectId,
        name,
        description,
        tags,
        executionPlans,
        defaultEnvironmentId,
        executionPolicy,
        estimatedDuration,
        status,
      });

      res.status(201).json({ success: true, data: suite });
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getSuite(req: Request, res: Response): Promise<void> {
    try {
      const { suiteId } = req.params;
      const suite = await this.manageTestSuites.get(suiteId);
      res.status(200).json({ success: true, data: suite });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateSuite(req: Request, res: Response): Promise<void> {
    try {
      const { suiteId } = req.params;
      const { name, description, tags, executionPlans, defaultEnvironmentId, executionPolicy, estimatedDuration, status } = req.body;

      const suite = await this.manageTestSuites.update({
        id: suiteId,
        name,
        description,
        tags,
        executionPlans,
        defaultEnvironmentId,
        executionPolicy,
        estimatedDuration,
        status,
      });

      res.status(200).json({ success: true, data: suite });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async deleteSuite(req: Request, res: Response): Promise<void> {
    try {
      const { suiteId } = req.params;
      await this.manageTestSuites.delete(suiteId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async addExecutionPlan(req: Request, res: Response): Promise<void> {
    try {
      const { suiteId } = req.params;
      const { executionPlanId } = req.body;
      const suite = await this.manageTestSuites.addExecutionPlan(suiteId, executionPlanId);
      res.status(200).json({ success: true, data: suite });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async removeExecutionPlan(req: Request, res: Response): Promise<void> {
    try {
      const { suiteId, executionPlanId } = req.params;
      const suite = await this.manageTestSuites.removeExecutionPlan(suiteId, executionPlanId);
      res.status(200).json({ success: true, data: suite });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async generateWithAI(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { providerId, previewOnly } = req.body;

      if (!providerId) {
        res.status(400).json({ success: false, message: 'providerId is required', details: null });
        return;
      }

      const result = await this.generateTestSuiteWithAI.execute({
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

  async reorderExecutionPlans(req: Request, res: Response): Promise<void> {
    try {
      const { suiteId } = req.params;
      const { orderedPlanIds } = req.body;
      const suite = await this.manageTestSuites.reorderExecutionPlans(suiteId, orderedPlanIds);
      res.status(200).json({ success: true, data: suite });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default TestSuiteController;