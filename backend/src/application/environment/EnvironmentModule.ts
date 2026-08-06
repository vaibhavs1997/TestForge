import { Router } from 'express';
import { asyncHandler } from '../../interfaces/middleware/AsyncHandler';
import { EnvironmentController } from '../../interfaces/environment/EnvironmentController';
import type { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository';
import type { EventPublisher } from '../EventPublisher';
import { CreateEnvironment } from './CreateEnvironment';
import { UpdateEnvironment } from './UpdateEnvironment';
import { DeleteEnvironment } from './DeleteEnvironment';
import { GetEnvironment } from './GetEnvironment';
import { ListEnvironments } from './ListEnvironments';

export interface EnvironmentModuleDeps {
  environmentRepository: EnvironmentRepository;
  eventPublisher: EventPublisher;
}

export class EnvironmentModule {
  readonly controller: EnvironmentController;
  readonly router: Router;

  constructor(deps: EnvironmentModuleDeps) {
    const createEnvironment = new CreateEnvironment(deps.environmentRepository, deps.eventPublisher);
    const updateEnvironment = new UpdateEnvironment(deps.environmentRepository, deps.eventPublisher);
    const deleteEnvironment = new DeleteEnvironment(deps.environmentRepository, deps.eventPublisher);
    const getEnvironment = new GetEnvironment(deps.environmentRepository);
    const listEnvironments = new ListEnvironments(deps.environmentRepository);

    this.controller = new EnvironmentController(
      createEnvironment,
      updateEnvironment,
      deleteEnvironment,
      getEnvironment,
      listEnvironments,
    );

    const router = Router();
    const c = this.controller;

    router.get('/projects/:projectId/environments', asyncHandler((req, res) => c.listEnvironments(req, res)));
    router.post('/projects/:projectId/environments', asyncHandler((req, res) => c.createEnvironment(req, res)));
    router.get('/projects/:projectId/environments/:environmentId', asyncHandler((req, res) => c.getEnvironment(req, res)));
    router.patch('/projects/:projectId/environments/:environmentId', asyncHandler((req, res) => c.updateEnvironment(req, res)));
    router.delete('/projects/:projectId/environments/:environmentId', asyncHandler((req, res) => c.deleteEnvironment(req, res)));

    this.router = router;
  }
}

export default EnvironmentModule;
