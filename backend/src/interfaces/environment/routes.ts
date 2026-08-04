// EnvironmentRoutes - Route definitions for Environment Management
import { Router } from 'express';
import { EnvironmentController } from './EnvironmentController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repository from the ApplicationContainer
const { environmentRepository } = container;

// Initialize use cases
import { CreateEnvironment } from '../../application/environment/CreateEnvironment';
import { UpdateEnvironment } from '../../application/environment/UpdateEnvironment';
import { DeleteEnvironment } from '../../application/environment/DeleteEnvironment';
import { GetEnvironment } from '../../application/environment/GetEnvironment';
import { ListEnvironments } from '../../application/environment/ListEnvironments';

const createEnvironment = new CreateEnvironment(environmentRepository);
const updateEnvironment = new UpdateEnvironment(environmentRepository);
const deleteEnvironment = new DeleteEnvironment(environmentRepository);
const getEnvironment = new GetEnvironment(environmentRepository);
const listEnvironments = new ListEnvironments(environmentRepository);

// Initialize controller
const environmentController = new EnvironmentController(
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  getEnvironment,
  listEnvironments
);

const router = Router();

// Environment routes
router.get('/projects/:projectId/environments', (req, res) => environmentController.listEnvironments(req, res));
router.post('/projects/:projectId/environments', (req, res) => environmentController.createEnvironment(req, res));
router.get('/projects/:projectId/environments/:environmentId', (req, res) => environmentController.getEnvironment(req, res));
router.patch('/projects/:projectId/environments/:environmentId', (req, res) => environmentController.updateEnvironment(req, res));
router.delete('/projects/:projectId/environments/:environmentId', (req, res) => environmentController.deleteEnvironment(req, res));

export { router as environmentRoutes };
export default router;