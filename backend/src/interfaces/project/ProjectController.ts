import { Request, Response } from 'express';
import { CreateProject, DeleteProject, GetProject, ListProjects, UpdateProject } from '../../application/project/ProjectUseCases';
import { createSuccessResponse } from '../../shared/ApiResponse';
import { AppError } from '../middleware/ErrorHandler';
import { ERROR_CODES } from '../../shared/ApiResponse';
import { canAccessProject, filterProjectsForAuth, getAuthSubject, getAuthTenantId, hasGlobalProjectAccess } from '../middleware/projectAccess';
import { getAuthConfig } from '../../config';

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
    const filtered = filterProjectsForAuth(projects, req.auth);
    res.status(200).json(createSuccessResponse(filtered));
  }

  async get(req: Request, res: Response): Promise<void> {
    const project = await this.getProject.execute(req.params.projectId);
    if (!(await canAccessProject(project, req.auth))) {
      throw new AppError(403, 'Forbidden for this project', ERROR_CODES.FORBIDDEN);
    }
    res.status(200).json(createSuccessResponse(project));
  }

  async create(req: Request, res: Response): Promise<void> {
    const { name, projectKey, description, id, status } = req.body ?? {};
    const authConfig = getAuthConfig();
    const subject = getAuthSubject(req);
    const tenantId = getAuthTenantId(req);
    const ownerId =
      authConfig.enabled && subject && !hasGlobalProjectAccess(req.auth) ? subject : undefined;
    const projectTenantId =
      authConfig.enabled && tenantId && !hasGlobalProjectAccess(req.auth) ? tenantId : undefined;

    const project = await this.createProject.execute({
      name,
      projectKey,
      description,
      id,
      status,
      ownerId,
      tenantId: projectTenantId,
    });
    res.status(201).json(createSuccessResponse(project));
  }

  async update(req: Request, res: Response): Promise<void> {
    const existing = await this.getProject.execute(req.params.projectId);
    if (!(await canAccessProject(existing, req.auth))) {
      throw new AppError(403, 'Forbidden for this project', ERROR_CODES.FORBIDDEN);
    }
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
    const existing = await this.getProject.execute(req.params.projectId);
    if (!(await canAccessProject(existing, req.auth))) {
      throw new AppError(403, 'Forbidden for this project', ERROR_CODES.FORBIDDEN);
    }
    await this.deleteProject.execute(req.params.projectId);
    res.status(204).send();
  }
}

export default ProjectController;
