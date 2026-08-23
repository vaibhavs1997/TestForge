import { Router } from 'express';
import { asyncHandler } from '../../interfaces/middleware/AsyncHandler.js';
import { EnvironmentController } from '../../interfaces/environment/EnvironmentController.js';
import type { EnvironmentRepository } from '../../domain/environment/EnvironmentRepository.js';
import type { EventPublisher } from '../EventPublisher.js';
import { CreateEnvironment } from './CreateEnvironment.js';
import { UpdateEnvironment } from './UpdateEnvironment.js';
import { DeleteEnvironment } from './DeleteEnvironment.js';
import { GetEnvironment } from './GetEnvironment.js';
import { ListEnvironments } from './ListEnvironments.js';
import { UpsertEnvironments } from './UpsertEnvironments.js';
import type { SecretStore } from '../../domain/security/SecretStore.js';

export interface EnvironmentModuleDeps {
  environmentRepository: EnvironmentRepository;
  eventPublisher: EventPublisher;
  secretStore?: SecretStore;
}

export class EnvironmentModule {
  readonly controller: EnvironmentController;
  readonly router: Router;

  constructor(deps: EnvironmentModuleDeps) {
    const createEnvironment = new CreateEnvironment(deps.environmentRepository, deps.eventPublisher, deps.secretStore);
    const updateEnvironment = new UpdateEnvironment(deps.environmentRepository, deps.eventPublisher, deps.secretStore);
    const deleteEnvironment = new DeleteEnvironment(deps.environmentRepository, deps.eventPublisher);
    const getEnvironment = new GetEnvironment(deps.environmentRepository);
    const listEnvironments = new ListEnvironments(deps.environmentRepository);
    const upsertEnvironments = new UpsertEnvironments(deps.environmentRepository, deps.secretStore);

    this.controller = new EnvironmentController(
      createEnvironment,
      updateEnvironment,
      deleteEnvironment,
      getEnvironment,
      listEnvironments,
      upsertEnvironments,
    );

    const router = Router();
    const c = this.controller;

    router.get('/projects/:projectId/environments', asyncHandler((req, res) => c.listEnvironments(req, res)));
    router.post('/projects/:projectId/environments', asyncHandler((req, res) => c.createEnvironment(req, res)));
    router.post(
      '/projects/:projectId/environments/upsert-batch',
      asyncHandler((req, res) => c.upsertEnvironments(req, res)),
    );
    router.get('/projects/:projectId/environments/:environmentId', asyncHandler((req, res) => c.getEnvironment(req, res)));
    router.patch('/projects/:projectId/environments/:environmentId', asyncHandler((req, res) => c.updateEnvironment(req, res)));
    router.delete('/projects/:projectId/environments/:environmentId', asyncHandler((req, res) => c.deleteEnvironment(req, res)));

    this.router = router;
  }
}

export default EnvironmentModule;
