// PipelineController - HTTP Controller for Pipeline operations
import { Request, Response } from 'express';
import { OrchestratePipeline } from '../../application/pipeline/OrchestratePipeline';
import { PipelineEntity, PipelineStage } from '../../domain/pipeline/PipelineEntity';

export class PipelineController {
  constructor(
    private readonly orchestratePipeline: OrchestratePipeline
  ) {}

  async startPipeline(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const pipeline = await this.orchestratePipeline.execute(projectId);
      res.status(201).json(pipeline);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to start pipeline' 
      });
    }
  }

  async getPipelineStatus(req: Request, res: Response): Promise<void> {
    try {
      const pipelineId = req.params.pipelineId;
      if (!pipelineId) {
        res.status(400).json({ error: 'Pipeline ID is required' });
        return;
      }

      const pipeline = await this.orchestratePipeline.execute(req.params.projectId);
      res.json(pipeline);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get pipeline status' 
      });
    }
  }

  async getProjectPipelines(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      res.json([]);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get project pipelines' 
      });
    }
  }

  async restartFailedStage(req: Request, res: Response): Promise<void> {
    try {
      const pipelineId = req.params.pipelineId;
      const stage = req.body.stage as PipelineStage;
      
      if (!pipelineId || !stage) {
        res.status(400).json({ error: 'Pipeline ID and stage are required' });
        return;
      }

      const pipeline = await this.orchestratePipeline.restartStage(pipelineId, stage);
      res.json(pipeline);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to restart stage' 
      });
    }
  }

  async cancelPipeline(req: Request, res: Response): Promise<void> {
    try {
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
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to cancel pipeline' 
      });
    }
  }
}

export default PipelineController;