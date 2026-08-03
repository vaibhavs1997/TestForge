// ExecutionController - Controller for Execution Engine endpoints
import { Request, Response } from 'express';
import { ExecutePlan } from '../../application/execution/ExecutePlan';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';

export class ExecutionController {
  constructor(
    private readonly executePlanUseCase: ExecutePlan,
    private readonly executionRunRepository: ExecutionRunRepository
  ) {}

  async startExecution(req: Request, res: Response): Promise<void> {
    try {
      const { executionPlanId } = req.params;
      const { failureMode = 'StopOnFailure' } = req.body;
      
      const run = await this.executePlanUseCase.execute(executionPlanId, failureMode as any);
      res.status(201).json({ success: true, data: run });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async getExecution(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;
      const run = await this.executionRunRepository.findById(runId);
      
      if (!run) {
        res.status(404).json({ success: false, message: 'Execution run not found', details: null });
        return;
      }
      
      res.status(200).json({ success: true, data: run });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async listExecutions(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const runs = await this.executionRunRepository.findByProject(projectId);
      res.status(200).json({ success: true, data: runs });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async cancelExecution(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;
      res.status(501).json({ success: false, message: 'Cancel execution not yet implemented', details: null });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default ExecutionController;