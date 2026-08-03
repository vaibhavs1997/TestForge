// ProjectContextController - Controller for Project Context endpoint
import { Request, Response } from 'express';
import { ProjectContextService } from '../../application/context/ProjectContextService';

export class ProjectContextController {
  constructor(private readonly projectContextService: ProjectContextService) {}

  async getProjectContext(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const context = await this.projectContextService.buildContext(projectId);
      res.status(200).json({ success: true, data: context });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default ProjectContextController;