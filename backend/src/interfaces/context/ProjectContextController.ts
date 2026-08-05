// ProjectContextController - Controller for Project Context endpoint
import { Request, Response } from 'express';
import { ProjectContextService } from '../../application/context/ProjectContextService';
import { createSuccessResponse, createErrorResponse } from '../types/ApiResponse';

export class ProjectContextController {
  constructor(private readonly projectContextService: ProjectContextService) {}

  async getProjectContext(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const context = await this.projectContextService.buildContext(projectId);
      res.status(200).json(createSuccessResponse(context));
    } catch (error: any) {
      res.status(500).json(createErrorResponse(error.message || 'Internal Server Error', 'INTERNAL_SERVER_ERROR'));
    }
  }
}

export default ProjectContextController;