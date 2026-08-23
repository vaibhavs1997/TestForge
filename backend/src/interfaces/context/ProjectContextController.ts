// ProjectContextController - Controller for Project Context endpoint
import { Request, Response } from 'express';
import { ProjectContextService } from '../../application/context/ProjectContextService.js';
import { createSuccessResponse } from "../../shared/ApiResponse.js";
export class ProjectContextController {
    constructor(private readonly projectContextService: ProjectContextService) { }
    async getProjectContext(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const context = await this.projectContextService.buildContext(projectId);
        res.status(200).json(createSuccessResponse(context));
    }
}
export default ProjectContextController;

