// KnowledgeController - Controller for Knowledge Management endpoints
import { Request, Response } from 'express';
import { CreateKnowledgeFlow } from '../../application/knowledge/CreateKnowledgeFlow';
import { UpdateKnowledgeFlow } from '../../application/knowledge/UpdateKnowledgeFlow';
import { DeleteKnowledgeFlow } from '../../application/knowledge/DeleteKnowledgeFlow';
import { GetKnowledgeFlow } from '../../application/knowledge/GetKnowledgeFlow';
import { ListKnowledgeFlows } from '../../application/knowledge/ListKnowledgeFlows';

export class KnowledgeController {
  constructor(
    private readonly createKnowledgeFlow: CreateKnowledgeFlow,
    private readonly updateKnowledgeFlow: UpdateKnowledgeFlow,
    private readonly deleteKnowledgeFlow: DeleteKnowledgeFlow,
    private readonly getKnowledgeFlow: GetKnowledgeFlow,
    private readonly listKnowledgeFlows: ListKnowledgeFlows
  ) {}

  async listFlows(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const flows = await this.listKnowledgeFlows.execute({ projectId });
      res.status(200).json({ success: true, data: flows });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async createFlow(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const { name, description, tags, status, steps } = req.body;

      const flow = await this.createKnowledgeFlow.execute({
        projectId,
        name,
        description,
        tags,
        status,
        steps,
      });

      res.status(201).json({ success: true, data: flow });
    } catch (error: any) {
      if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      const flow = await this.getKnowledgeFlow.execute(flowId);
      res.status(200).json({ success: true, data: flow });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      const { name, description, tags, status, steps } = req.body;

      const flow = await this.updateKnowledgeFlow.execute({
        id: flowId,
        name,
        description,
        tags,
        status,
        steps,
      });

      res.status(200).json({ success: true, data: flow });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('required') || error.message.includes('cannot be empty')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already exists')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async deleteFlow(req: Request, res: Response): Promise<void> {
    try {
      const { flowId } = req.params;
      await this.deleteKnowledgeFlow.execute(flowId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default KnowledgeController;