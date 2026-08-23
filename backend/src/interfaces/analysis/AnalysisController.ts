// AnalysisController - Controller for AI Project Analysis endpoints
import { Request, Response } from 'express';
import { CreateAnalysis } from '../../application/analysis/CreateAnalysis.js';
import { UpdateAnalysis } from '../../application/analysis/UpdateAnalysis.js';
import { DeleteAnalysis } from '../../application/analysis/DeleteAnalysis.js';
import { GetAnalysis } from '../../application/analysis/GetAnalysis.js';
import { ListAnalysis } from '../../application/analysis/ListAnalysis.js';
import { AnalyzeProject } from '../../application/analysis/AnalyzeProject.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class AnalysisController {
    constructor(private readonly createAnalysisUseCase: CreateAnalysis, private readonly updateAnalysisUseCase: UpdateAnalysis, private readonly deleteAnalysisUseCase: DeleteAnalysis, private readonly getAnalysisUseCase: GetAnalysis, private readonly listAnalysisUseCase: ListAnalysis, private readonly analyzeProjectUseCase: AnalyzeProject) { }
    async listAnalysis(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const items = await this.listAnalysisUseCase.execute({ projectId });
        res.status(200).json(createSuccessResponse(items));
    }
    async createAnalysis(req: Request, res: Response): Promise<void> {
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
    }
    async getAnalysis(req: Request, res: Response): Promise<void> {
        const { analysisId } = req.params;
        const analysis = await this.getAnalysisUseCase.execute(analysisId);
        res.status(200).json(createSuccessResponse(analysis));
    }
    async updateAnalysis(req: Request, res: Response): Promise<void> {
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
    }
    async deleteAnalysis(req: Request, res: Response): Promise<void> {
        const { analysisId } = req.params;
        await this.deleteAnalysisUseCase.execute(analysisId);
        res.status(204).send();
    }
    async analyzeProject(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const cards = await this.analyzeProjectUseCase.execute(projectId);
        res.status(200).json(createSuccessResponse(cards));
    }
}
export default AnalysisController;

