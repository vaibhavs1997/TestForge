// RecommendationController - Controller for Recommendation endpoints
import { Request, Response } from 'express';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';

export class RecommendationController {
  constructor(
    private readonly recommendationEngine: RecommendationEngine
  ) {}

  async analyzeProject(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const recommendations = await this.recommendationEngine.analyzeProject(projectId);
      res.status(200).json({ success: true, data: recommendations });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default RecommendationController;