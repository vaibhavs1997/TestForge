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
    private readonly generateTestDesignsUseCase: GenerateTestDesigns
  ) {}

  async listRequirements(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const approvalStatus = req.query.approvalStatus as string | undefined;
      const items = await this.listRequirementsUseCase.execute({ projectId, approvalStatus });
      res.status(200).json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createRequirement(req: Request, res: Response): Promise<void> {
    try {
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

      res.status(201).json({ success: true, data: requirement });
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getRequirement(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const requirement = await this.getRequirementUseCase.execute(requirementId);
      res.status(200).json({ success: true, data: requirement });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateRequirement(req: Request, res: Response): Promise<void> {
    try {
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

      res.status(200).json({ success: true, data: requirement });
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

  async deleteRequirement(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      await this.deleteRequirementUseCase.execute(requirementId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async generateFromAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { analysisId } = req.params;
      const requirements = await this.generateFromAnalysisUseCase.execute(projectId, analysisId);
      res.status(201).json({ success: true, data: requirements });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async validateReadiness(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const report = await this.validateRequirementReadinessUseCase.execute(requirementId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async planTestStrategy(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const strategy = await this.planTestStrategyUseCase.execute(requirementId);
      res.status(201).json({ success: true, data: strategy });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Only Approved')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async generateTestDesigns(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const designs = await this.generateTestDesignsUseCase.execute(requirementId);
      res.status(201).json({ success: true, data: designs });
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Test strategy not found')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default RequirementController;