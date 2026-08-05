// AnalysisController - Controller for AI Project Analysis endpoints
import { Request, Response } from 'express';
import { CreateAnalysis } from '../../application/analysis/CreateAnalysis';
import { UpdateAnalysis } from '../../application/analysis/UpdateAnalysis';
import { DeleteAnalysis } from '../../application/analysis/DeleteAnalysis';
import { GetAnalysis } from '../../application/analysis/GetAnalysis';
import { ListAnalysis } from '../../application/analysis/ListAnalysis';
import { AnalyzeProject } from '../../application/analysis/AnalyzeProject';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class AnalysisController {
  constructor(
    private readonly createAnalysisUseCase: CreateAnalysis,
    private readonly updateAnalysisUseCase: UpdateAnalysis,
    private readonly deleteAnalysisUseCase: DeleteAnalysis,
    private readonly getAnalysisUseCase: GetAnalysis,
    private readonly listAnalysisUseCase: ListAnalysis,
    private readonly analyzeProjectUseCase: AnalyzeProject
  ) {}

  async listAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const items = await this.listAnalysisUseCase.execute({ projectId });
      res.status(200).json(createSuccessResponse(items));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async createAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { title, description, category, confidence, relatedOperations, relatedFlows, relatedDatasets, relatedRuntimeVariables, status } = req.body;

      const analysis = await this.createAnalysisUseCase.execute({
        projectId,
        title,
        description,
        category,
        confidence,
        relatedOperations,
        relatedFlows,
        relatedDatasets,
        relatedRuntimeVariables,
        status,
      });

      res.status(201).json(createSuccessResponse(analysis));
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json(createErrorResponse(error.message, 'VALIDATION_ERROR'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async getAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { analysisId } = req.params;
      const analysis = await this.getAnalysisUseCase.execute(analysisId);
      res.status(200).json(createSuccessResponse(analysis));
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async updateAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { analysisId } = req.params;
      const { title, description, category, confidence, relatedOperations, relatedFlows, relatedDatasets, relatedRuntimeVariables, status } = req.body;

      const analysis = await this.updateAnalysisUseCase.execute({
        id: analysisId,
        title,
        description,
        category,
        confidence,
        relatedOperations,
        relatedFlows,
        relatedDatasets,
        relatedRuntimeVariables,
        status,
      });

      res.status(200).json(createSuccessResponse(analysis));
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

  async deleteAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { analysisId } = req.params;
      await this.deleteAnalysisUseCase.execute(analysisId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse(error.message, 'NOT_FOUND'));
      } else {
        res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
      }
    }
  }

  async analyzeProject(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const cards = await this.analyzeProjectUseCase.execute(projectId);
      res.status(200).json(createSuccessResponse(cards));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default AnalysisController;