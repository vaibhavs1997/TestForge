import { Router } from 'express';
import { asyncHandler } from '../../interfaces/middleware/AsyncHandler';
import { ProjectController } from '../../interfaces/project/ProjectController';
import type { ProjectRepository } from '../../domain/project/ProjectRepository';
import {
  CreateProject,
  DeleteProject,
  GetProject,
  ListProjects,
  UpdateProject,
} from './ProjectUseCases';

export class ProjectModule {
  readonly repository: ProjectRepository;
  readonly controller: ProjectController;
  readonly router: Router;

  constructor(repository: ProjectRepository) {
    this.repository = repository;
    this.controller = new ProjectController(
      new ListProjects(this.repository),
      new GetProject(this.repository),
      new CreateProject(this.repository),
      new UpdateProject(this.repository),
      new DeleteProject(this.repository),
    );

    const router = Router();
    const controller = this.controller;

    router.get('/projects', asyncHandler((req, res) => controller.list(req, res)));
    router.post('/projects', asyncHandler((req, res) => controller.create(req, res)));
    router.get('/projects/:projectId', asyncHandler((req, res) => controller.get(req, res)));
    router.patch('/projects/:projectId', asyncHandler((req, res) => controller.update(req, res)));
    router.delete('/projects/:projectId', asyncHandler((req, res) => controller.remove(req, res)));

    this.router = router;
  }
}

export default ProjectModule;
