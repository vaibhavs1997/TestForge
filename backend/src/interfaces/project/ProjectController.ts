import { Request, Response } from 'express';
import { CreateProject, DeleteProject, GetProject, ListProjects, UpdateProject } from '../../application/project/ProjectUseCases';
import { createSuccessResponse } from '../../shared/ApiResponse';

export class ProjectController {
  constructor(
    private readonly listProjects: ListProjects,
    private readonly getProject: GetProject,
    private readonly createProject: CreateProject,
    private readonly updateProject: UpdateProject,
    private readonly deleteProject: DeleteProject,
  ) {}

  async list(req: Request, res: Response): Promise<void> {
    const projects = await this.listProjects.execute();
    res.status(200).json(createSuccessResponse(projects));
  }

  async get(req: Request, res: Response): Promise<void> {
    const project = await this.getProject.execute(req.params.projectId);
    res.status(200).json(createSuccessResponse(project));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { name, projectKey, description, id, status } = req.body ?? {};
    const project = await this.createProject.execute({ name, projectKey, description, id, status });
    res.status(201).json(createSuccessResponse(project));
  }

  async update(req: Request, res: Response): Promise<void> {
    const { name, projectKey, description, status } = req.body ?? {};
    const project = await this.updateProject.execute(req.params.projectId, {
      name,
      projectKey,
      description,
      status,
    });
    res.status(200).json(createSuccessResponse(project));
  }

  async remove(req: Request, res: Response): Promise<void> {
    await this.deleteProject.execute(req.params.projectId);
    res.status(204).send();
  }
}

export default ProjectController;
