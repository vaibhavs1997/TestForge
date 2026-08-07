// AIProviderRoutes - Route definitions for AI Provider Management module
import { Router } from 'express';
import { AIProviderController } from './AIProviderController';
import { container } from '../../application/ApplicationContainer';
import { asyncHandler } from '../middleware/AsyncHandler';

// Reuse shared repositories and services from the ApplicationContainer
const {
  aiProviderRepository,
  aiProviderRegistry,
  aiProviderResolutionService,
  manageAIProviders,
} = container;

// Initialize controller
const aiProviderController = new AIProviderController(manageAIProviders);

const router = Router();

// AI Provider Management routes
router.get('/projects/:projectId/ai/providers', asyncHandler((req, res) => aiProviderController.listProviders(req, res)));
router.get('/projects/:projectId/ai/providers/:providerId', asyncHandler((req, res) => aiProviderController.getProvider(req, res)));
router.post('/projects/:projectId/ai/providers', asyncHandler((req, res) => aiProviderController.createProvider(req, res)));
router.patch('/projects/:projectId/ai/providers/:providerId', asyncHandler((req, res) => aiProviderController.updateProvider(req, res)));
router.delete('/projects/:projectId/ai/providers/:providerId', asyncHandler((req, res) => aiProviderController.deleteProvider(req, res)));
router.post('/projects/:projectId/ai/providers/:providerId/test', asyncHandler((req, res) => aiProviderController.testProvider(req, res)));
router.post('/projects/:projectId/ai/providers/:providerId/enable', asyncHandler((req, res) => aiProviderController.enableProvider(req, res)));
router.post('/projects/:projectId/ai/providers/:providerId/disable', asyncHandler((req, res) => aiProviderController.disableProvider(req, res)));
router.post('/projects/:projectId/ai/providers/:providerId/default', asyncHandler((req, res) => aiProviderController.setDefaultProvider(req, res)));
router.post('/projects/:projectId/ai/providers/:providerId/estimate', asyncHandler((req, res) => aiProviderController.estimateProvider(req, res)));
router.post('/projects/:projectId/ai/providers/:providerId/generate', asyncHandler((req, res) => aiProviderController.generateProvider(req, res)));
router.get('/ai/providers/types', asyncHandler((req, res) => aiProviderController.listSupportedTypes(req, res)));
router.get('/ai/providers/adapters', asyncHandler((req, res) => aiProviderController.listAdapters(req, res)));

export { router as aiProviderRoutes };
export default router;