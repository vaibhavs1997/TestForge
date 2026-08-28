import { Request, Response } from 'express';
import { CreateProject, DeleteProject, GetProject, ListProjects, UpdateProject } from '../../application/project/ProjectUseCases.js';
import { createSuccessResponse } from '../../shared/ApiResponse.js';
import { AppError } from '../middleware/ErrorHandler.js';
import { ERROR_CODES } from '../../shared/ApiResponse.js';
import { canAccessProject, filterProjectsForAuth, getAuthSubject, getAuthTenantId, hasGlobalProjectAccess } from '../middleware/projectAccess.js';
import { getAuthConfig } from '../../config.js';
import { AuditLogService } from '../../application/audit/AuditLogService.js';
import { ValidationError } from '../../shared/errors.js';

export class ProjectController {
  constructor(
    private readonly listProjects: ListProjects,
    private readonly getProject: GetProject,
    private readonly createProject: CreateProject,
    private readonly updateProject: UpdateProject,
    private readonly deleteProject: DeleteProject,
    private readonly auditLogService: AuditLogService,
  ) {}

  private validateProjectInput(input: { name?: unknown; description?: unknown; status?: unknown }, isCreate = false): void {
    if (isCreate && (typeof input.name !== 'string' || !input.name.trim())) {
      throw new ValidationError('Project name is required');
    }
    if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim())) {
      throw new ValidationError('Project name cannot be empty');
    }
    if (input.description !== undefined && typeof input.description !== 'string') {
      throw new ValidationError('Project description must be text');
    }
    if (input.status !== undefined && input.status !== 'active' && input.status !== 'archived') {
      throw new ValidationError('Project status must be active or archived');
    }
  }

  private actor(req: Request): string {
    return getAuthSubject(req) || 'System';
  }

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
    this.validateProjectInput({ name, description, status }, true);
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
    await this.auditLogService.logAction({
      projectId: project.id, module: 'Project', entityType: 'Project', entityId: project.id,
      action: 'CREATE', newValue: { name: project.name }, performedBy: this.actor(req),
    });
    res.status(201).json(createSuccessResponse(project));
  }

  async update(req: Request, res: Response): Promise<void> {
    const existing = await this.getProject.execute(req.params.projectId);
    if (!(await canAccessProject(existing, req.auth))) {
      throw new AppError(403, 'Forbidden for this project', ERROR_CODES.FORBIDDEN);
    }
    const { name, projectKey, description, status } = req.body ?? {};
    this.validateProjectInput({ name, description, status });
    const project = await this.updateProject.execute(req.params.projectId, {
      name,
      projectKey,
      description,
      status,
    });
    const action = existing.status === 'archived' && project.status === 'active'
      ? 'RESTORE'
      : project.status === 'archived' && existing.status !== 'archived'
        ? 'ARCHIVE'
        : 'UPDATE';
    await this.auditLogService.logAction({
      projectId: project.id, module: 'Project', entityType: 'Project', entityId: project.id,
      action, oldValue: { name: existing.name, status: existing.status },
      newValue: { name: project.name, status: project.status }, performedBy: this.actor(req),
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

  async recordOpen(req: Request, res: Response): Promise<void> {
    const existing = await this.getProject.execute(req.params.projectId);
    if (!(await canAccessProject(existing, req.auth))) {
      throw new AppError(403, 'Forbidden for this project', ERROR_CODES.FORBIDDEN);
    }
    const project = await this.updateProject.execute(existing.id, { lastOpenedAt: Date.now() });
    await this.auditLogService.logAction({
      projectId: project.id, module: 'Project', entityType: 'Project', entityId: project.id,
      action: 'OPEN', newValue: { name: project.name }, performedBy: this.actor(req),
    });
    res.status(200).json(createSuccessResponse(project));
  }

  async recentActivity(req: Request, res: Response): Promise<void> {
    const visibleProjectIds = new Set(filterProjectsForAuth(await this.listProjects.execute(), req.auth).map((project) => project.id));
    const logs = await this.auditLogService.getRecentLogs(100);
    const projectLifecycleLogs = logs.filter((log) =>
      visibleProjectIds.has(log.projectId)
      && log.module === 'Project'
      && log.entityType === 'Project',
    );
    res.status(200).json(createSuccessResponse(projectLifecycleLogs.slice(0, 5)));
  }
}

export default ProjectController;
