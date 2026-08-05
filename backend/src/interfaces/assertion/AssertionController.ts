// AssertionController - Controller for Assertion Library endpoints
import { Request, Response } from 'express';
import { ManageAssertions } from '../../application/assertion/ManageAssertions';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class AssertionController {
    constructor(private readonly manageAssertions: ManageAssertions) { }
    async createAssertion(req: Request, res: Response): Promise<void> {
        const assertion = await this.manageAssertions.createAssertion(req.body);
        res.status(201).json(createSuccessResponse(assertion));
    }
    async updateAssertion(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const assertion = await this.manageAssertions.updateAssertion(id, req.body);
        res.status(200).json(createSuccessResponse(assertion));
    }
    async deleteAssertion(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        await this.manageAssertions.deleteAssertion(id);
        res.status(200).json(createSuccessResponse(null));
    }
    async getAssertion(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const assertion = await this.manageAssertions.getAssertion(id);
        if (!assertion) {
            throw new Error('Assertion not found');
        }
        res.status(200).json(createSuccessResponse(assertion));
    }
    async listAssertions(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const assertions = await this.manageAssertions.listAssertions(projectId);
        res.status(200).json(createSuccessResponse(assertions));
    }
    async searchAssertions(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            throw new Error('Query parameter "q" is required');
        }
        const assertions = await this.manageAssertions.searchAssertions(projectId, q);
        res.status(200).json(createSuccessResponse(assertions));
    }
    async toggleAssertion(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const { enabled } = req.body;
        const assertion = await this.manageAssertions.toggleAssertion(id, enabled);
        res.status(200).json(createSuccessResponse(assertion));
    }
    async duplicateAssertion(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        const assertion = await this.manageAssertions.duplicateAssertion(id);
        res.status(201).json(createSuccessResponse(assertion));
    }
}
export default AssertionController;

