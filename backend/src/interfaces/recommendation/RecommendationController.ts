// RecommendationController - Controller for Recommendation endpoints
import { Request, Response } from 'express';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class RecommendationController {
  constructor(
    private readonly recommendationEngine: RecommendationEngine
  ) {}

  async analyzeProject(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const recommendations = await this.recommendationEngine.analyzeProject(projectId);
      res.status(200).json(createSuccessResponse(recommendations));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default RecommendationController;