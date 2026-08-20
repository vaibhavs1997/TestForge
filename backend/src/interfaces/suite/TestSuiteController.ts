// TestSuiteController - Controller for Test Suite Management endpoints
import { Request, Response } from 'express';
import { ManageTestSuites } from '../../application/suite/ManageTestSuites';
import { GenerateTestSuiteWithAI } from '../../application/suite/GenerateTestSuiteWithAI';
import { createSuccessResponse } from "../../shared/ApiResponse";
import { ExecuteSuite } from '../../application/suite/ExecuteSuite';
export class TestSuiteController {
    constructor(private readonly manageTestSuites: ManageTestSuites, private readonly generateTestSuiteWithAI: GenerateTestSuiteWithAI, private readonly executeSuite: ExecuteSuite) { }
    async execute(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { failureMode, executionProfileId } = req.body || {};
        const runs = await this.executeSuite.execute(suiteId, failureMode, executionProfileId);
        res.status(201).json(createSuccessResponse(runs));
    }
    async listSuites(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const items = await this.manageTestSuites.list(projectId);
        res.status(200).json(createSuccessResponse(items));
    }
    async createSuite(req: Request, res: Response): Promise<void> {
        const projectId = req.params.projectId;
        const { name, description, tags, executionPlans, defaultEnvironmentId, executionPolicy, estimatedDuration, status } = req.body;
        const suite = await this.manageTestSuites.create({
            projectId,
            name,
            description,
            tags,
            executionPlans,
            defaultEnvironmentId,
            executionPolicy,
            estimatedDuration,
            status,
        });
        res.status(201).json(createSuccessResponse(suite));
    }
    async getSuite(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const suite = await this.manageTestSuites.get(suiteId);
        res.status(200).json(createSuccessResponse(suite));
    }
    async updateSuite(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { name, description, tags, executionPlans, defaultEnvironmentId, executionPolicy, estimatedDuration, status } = req.body;
        const suite = await this.manageTestSuites.update({
            id: suiteId,
            name,
            description,
            tags,
            executionPlans,
            defaultEnvironmentId,
            executionPolicy,
            estimatedDuration,
            status,
        });
        res.status(200).json(createSuccessResponse(suite));
    }
    async deleteSuite(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        await this.manageTestSuites.delete(suiteId);
        res.status(204).send();
    }
    async addExecutionPlan(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { executionPlanId } = req.body;
        const suite = await this.manageTestSuites.addExecutionPlan(suiteId, executionPlanId);
        res.status(200).json(createSuccessResponse(suite));
    }
    async removeExecutionPlan(req: Request, res: Response): Promise<void> {
        const { suiteId, executionPlanId } = req.params;
        const suite = await this.manageTestSuites.removeExecutionPlan(suiteId, executionPlanId);
        res.status(200).json(createSuccessResponse(suite));
    }
    async generateWithAI(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { providerId, previewOnly } = req.body;
        if (!providerId) {
            throw new Error('providerId is required');
        }
        const result = await this.generateTestSuiteWithAI.execute({
            projectId,
            providerId,
            previewOnly: !!previewOnly,
        });
        res.status(200).json(createSuccessResponse(result));
    }
    async reorderExecutionPlans(req: Request, res: Response): Promise<void> {
        const { suiteId } = req.params;
        const { orderedPlanIds } = req.body;
        const suite = await this.manageTestSuites.reorderExecutionPlans(suiteId, orderedPlanIds);
        res.status(200).json(createSuccessResponse(suite));
    }
}
export default TestSuiteController;

