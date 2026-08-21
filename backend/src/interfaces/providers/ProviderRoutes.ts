// ProviderRoutes - Route definitions for Provider Framework
import { Router } from 'express';
import { ProviderController } from './ProviderController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repository from the ApplicationContainer
const { providerRepository } = container;

// Initialize use case
import { ManageProviders } from '../../application/providers/ManageProviders.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const manageProviders = new ManageProviders(providerRepository);

// Initialize controller
const providerController = new ProviderController(manageProviders);

const router = Router();

// Provider routes
router.get('/adapter-types', asyncHandler((req, res) => providerController.listAdapterTypes(req, res)));
router.post('/projects/:projectId/providers', asyncHandler((req, res) => providerController.create(req, res)));
router.get('/projects/:projectId/providers', asyncHandler((req, res) => providerController.listProviders(req, res)));
router.get('/projects/:projectId/providers/:providerId', asyncHandler((req, res) => providerController.getProvider(req, res)));
router.post('/projects/:projectId/providers/:providerId/test', asyncHandler((req, res) => providerController.testConnection(req, res)));
router.patch('/projects/:projectId/providers/:providerId', asyncHandler((req, res) => providerController.updateProvider(req, res)));
router.delete('/projects/:projectId/providers/:providerId', asyncHandler((req, res) => providerController.deleteProvider(req, res)));

export { router as providerRoutes };
export default router;