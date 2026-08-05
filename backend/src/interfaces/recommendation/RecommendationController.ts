// RecommendationController - Controller for Recommendation endpoints
import { Request, Response } from 'express';
import { RecommendationEngine } from '../../application/recommendation/RecommendationEngine';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class RecommendationController {
    constructor(private readonly recommendationEngine: RecommendationEngine) { }
    async analyzeProject(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const recommendations = await this.recommendationEngine.analyzeProject(projectId);
        res.status(200).json(createSuccessResponse(recommendations));
    }
}
export default RecommendationController;

