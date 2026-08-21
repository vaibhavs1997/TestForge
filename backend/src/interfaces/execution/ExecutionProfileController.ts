// ExecutionProfileController - REST Controller for Execution Profiles
import { Request, Response } from 'express';
import { ManageExecutionProfiles } from '../../application/execution/ManageExecutionProfiles.js';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class ExecutionProfileController {
    constructor(private readonly manageProfiles: ManageExecutionProfiles) { }
    async listByProject(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const profiles = await this.manageProfiles.listByProject(projectId);
        res.status(200).json(createSuccessResponse(profiles));
    }
    async getDefault(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const profile = await this.manageProfiles.getDefault(projectId);
        res.status(200).json(createSuccessResponse(profile));
    }
    async getById(req: Request, res: Response): Promise<void> {
        const { profileId } = req.params;
        const profile = await this.manageProfiles.getById(profileId);
        if (!profile) {
            throw new Error('Profile not found');
        }
        res.status(200).json(createSuccessResponse(profile));
    }
    async create(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const body = req.body;
        const profile = await this.manageProfiles.create({
            ...body,
            projectId,
        });
        res.status(201).json(createSuccessResponse(profile));
    }
    async update(req: Request, res: Response): Promise<void> {
        const { profileId } = req.params;
        const body = req.body;
        const profile = await this.manageProfiles.update(profileId, body);
        res.status(200).json(createSuccessResponse(profile));
    }
    async delete(req: Request, res: Response): Promise<void> {
        const { profileId } = req.params;
        await this.manageProfiles.delete(profileId);
        res.status(200).json(createSuccessResponse(null));
    }
    async duplicate(req: Request, res: Response): Promise<void> {
        const { profileId } = req.params;
        const { name } = req.body;
        if (!name) {
            throw new Error('New profile name is required');
        }
        const profile = await this.manageProfiles.duplicate(profileId, name);
        res.status(201).json(createSuccessResponse(profile));
    }
}
export default ExecutionProfileController;

