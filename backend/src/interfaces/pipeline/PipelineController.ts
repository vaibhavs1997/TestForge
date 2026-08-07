// PipelineController - HTTP Controller for Pipeline operations
import { Request, Response } from 'express';
import { OrchestratePipeline } from '../../application/pipeline/OrchestratePipeline';
import { RunAIPipeline } from '../../application/pipeline/RunAIPipeline';
import { PipelineEntity, PipelineStage } from '../../domain/pipeline/PipelineEntity';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class PipelineController {
    constructor(private readonly orchestratePipeline: OrchestratePipeline, private readonly runAIPipeline: RunAIPipeline) { }
    async startPipeline(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        const pipeline = await this.orchestratePipeline.execute(projectId);
        res.status(201).json(pipeline);
    }
    async getPipelineStatus(req: Request, res: Response): Promise<void> {
        const pipelineId = req.params.pipelineId;
        if (!pipelineId) {
            res.status(400).json({ error: 'Pipeline ID is required' });
            return;
        }
        const pipeline = await this.orchestratePipeline.execute(req.params.projectId);
        res.json(pipeline);
    }
    async getProjectPipelines(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        res.json([]);
    }
    async restartFailedStage(req: Request, res: Response): Promise<void> {
        const pipelineId = req.params.pipelineId;
        const stage = req.body.stage as PipelineStage;
        if (!pipelineId || !stage) {
            res.status(400).json({ error: 'Pipeline ID and stage are required' });
            return;
        }
        const pipeline = await this.orchestratePipeline.restartStage(pipelineId, stage);
        res.json(pipeline);
    }
    async runAIPipelineHandler(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { providerId, autoApprove } = req.body;
        if (!projectId) {
            res.status(400).json({ error: 'Project ID is required' });
            return;
        }
        if (!providerId) {
            res.status(400).json({ error: 'providerId is required' });
            return;
        }
        const result = await this.runAIPipeline.execute({
            projectId,
            providerId,
            autoApprove: !!autoApprove,
        });
        res.status(200).json(createSuccessResponse(result));
    }
    async cancelPipeline(req: Request, res: Response): Promise<void> {
        const pipelineId = req.params.pipelineId;
        if (!pipelineId) {
            res.status(400).json({ error: 'Pipeline ID is required' });
            return;
        }
        const pipeline = await this.orchestratePipeline.cancelPipeline(pipelineId);
        if (!pipeline) {
            res.status(404).json({ error: 'Pipeline not found' });
            return;
        }
        res.json(pipeline);
    }
}
export default PipelineController;

