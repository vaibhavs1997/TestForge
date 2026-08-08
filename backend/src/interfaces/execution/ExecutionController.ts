// ExecutionController - Controller for Execution Engine endpoints
import { Request, Response } from 'express';
import { ExecutePlan } from '../../application/execution/ExecutePlan';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class ExecutionController {
    constructor(
        private readonly executePlanUseCase: ExecutePlan,
        private readonly executionRunRepository: ExecutionRunRepository,
        private readonly executionPlanRepository: ExecutionPlanRepository,
    ) { }
    async startExecution(req: Request, res: Response): Promise<void> {
        const { executionPlanId } = req.params;
        const { failureMode = 'StopOnFailure', executionProfileId } = req.body;
        const run = await this.executePlanUseCase.execute(executionPlanId, failureMode as any, executionProfileId);
        res.status(201).json(createSuccessResponse(run));
    }
    async getExecution(req: Request, res: Response): Promise<void> {
        const { runId } = req.params;
        const run = await this.executionRunRepository.findById(runId);
        if (!run) {
            throw new Error('Execution run not found');
        }
        res.status(200).json(createSuccessResponse(run));
    }
    async listExecutions(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        try {
            const runs = await this.executionRunRepository.findByProject(projectId);
            res.status(200).json(createSuccessResponse(runs));
        } catch (err: unknown) {
            console.error('[ExecutionController.listExecutions]', err);
            res.status(200).json(createSuccessResponse([]));
        }
    }
    async listExecutionPlans(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const plans = await this.executionPlanRepository.findByProject(projectId);
        res.status(200).json(createSuccessResponse(plans));
    }
    async cancelExecution(req: Request, res: Response): Promise<void> {
        const { runId } = req.params;
        throw new Error('Cancel execution not yet implemented');
    }
}
export default ExecutionController;

