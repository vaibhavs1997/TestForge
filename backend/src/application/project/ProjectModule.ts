import { Router } from 'express';
import { asyncHandler } from '../../interfaces/middleware/AsyncHandler.js';
import { ProjectController } from '../../interfaces/project/ProjectController.js';
import type { ProjectRepository } from '../../domain/project/ProjectRepository.js';
import {
  CreateProject,
  DeleteProject,
  GetProject,
  ListProjects,
  UpdateProject,
} from './ProjectUseCases.js';
import type { AuditLogService } from '../audit/AuditLogService.js';

export class ProjectModule {
  readonly repository: ProjectRepository;
  readonly controller: ProjectController;
  readonly router: Router;

  constructor(repository: ProjectRepository, auditLogService: AuditLogService) {
    this.repository = repository;
    this.controller = new ProjectController(
      new ListProjects(this.repository),
      new GetProject(this.repository),
      new CreateProject(this.repository),
      new UpdateProject(this.repository),
      new DeleteProject(this.repository),
      auditLogService,
    );

    const router = Router();
    const controller = this.controller;

    router.get('/projects', asyncHandler((req, res) => controller.list(req, res)));
    // Aggregate activity cannot live under /projects/:projectId because the
    // project authorization middleware would treat "activity" as a project id.
    router.get('/projects-activity', asyncHandler((req, res) => controller.recentActivity(req, res)));
    router.post('/projects', asyncHandler((req, res) => controller.create(req, res)));
    router.get('/projects/:projectId', asyncHandler((req, res) => controller.get(req, res)));
    router.patch('/projects/:projectId', asyncHandler((req, res) => controller.update(req, res)));
    router.post('/projects/:projectId/open', asyncHandler((req, res) => controller.recordOpen(req, res)));
    router.delete('/projects/:projectId', asyncHandler((req, res) => controller.remove(req, res)));

    this.router = router;
  }
}

export default ProjectModule;
