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
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

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
    private readonly planExecutionUseCase: PlanExecution
  ) {}

  async listRequirements(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const approvalStatus = req.query.approvalStatus as string | undefined;
      const items = await this.listRequirementsUseCase.execute({ projectId, approvalStatus });
      res.status(200).json(createSuccessResponse(items));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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

      res.status(201).json(createSuccessResponse(requirement));
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getRequirement(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const requirement = await this.getRequirementUseCase.execute(requirementId);
      res.status(200).json(createSuccessResponse(requirement));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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

      res.status(200).json(createSuccessResponse(requirement));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
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
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async generateFromAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { analysisId } = req.params;
      const requirements = await this.generateFromAnalysisUseCase.execute(projectId, analysisId);
      res.status(201).json(createSuccessResponse(requirements));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async validateReadiness(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const report = await this.validateRequirementReadinessUseCase.execute(requirementId);
      res.status(200).json(createSuccessResponse(report));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async planTestStrategy(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const strategy = await this.planTestStrategyUseCase.execute(requirementId);
      res.status(201).json(createSuccessResponse(strategy));
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Only Approved')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async generateTestDesigns(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const designs = await this.generateTestDesignsUseCase.execute(requirementId);
      res.status(201).json(createSuccessResponse(designs));
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('Test strategy not found')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async planExecution(req: Request, res: Response): Promise<void> {
    try {
      const { requirementId } = req.params;
      const plans = await this.planExecutionUseCase.execute(requirementId);
      res.status(201).json(createSuccessResponse(plans));
    } catch (error: any) {
      if (error.message.includes('not found') || error.message.includes('No test designs')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }
}

export default RequirementController;