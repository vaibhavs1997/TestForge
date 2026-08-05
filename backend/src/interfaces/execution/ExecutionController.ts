// ExecutionController - Controller for Execution Engine endpoints
import { Request, Response } from 'express';
import { ExecutePlan } from '../../application/execution/ExecutePlan';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class ExecutionController {
  constructor(
    private readonly executePlanUseCase: ExecutePlan,
    private readonly executionRunRepository: ExecutionRunRepository
  ) {}

  async startExecution(req: Request, res: Response): Promise<void> {
    try {
      const { executionPlanId } = req.params;
      const { failureMode = 'StopOnFailure', executionProfileId } = req.body;
      
      const run = await this.executePlanUseCase.execute(executionPlanId, failureMode as any, executionProfileId);
      res.status(201).json(createSuccessResponse(run));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async getExecution(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;
      const run = await this.executionRunRepository.findById(runId);
      
      if (!run) {
        res.status(404).json(createErrorResponse('Execution run not found', 'NOT_FOUND'));
        return;
      }
      
      res.status(200).json(createSuccessResponse(run));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async listExecutions(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.projectId;
      const runs = await this.executionRunRepository.findByProject(projectId);
      res.status(200).json(createSuccessResponse(runs));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }

  async cancelExecution(req: Request, res: Response): Promise<void> {
    try {
      const { runId } = req.params;
      res.status(501).json({ success: false, message: 'Cancel execution not yet implemented', details: null });
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default ExecutionController;