// AIProviderRoutes - Route definitions for AI Provider Management module
import { Router } from 'express';
import { AIProviderController } from './AIProviderController';
import { container } from '../../application/ApplicationContainer';

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
router.get('/projects/:projectId/ai/providers', (req, res) => aiProviderController.listProviders(req, res));
router.get('/projects/:projectId/ai/providers/:providerId', (req, res) => aiProviderController.getProvider(req, res));
router.post('/projects/:projectId/ai/providers', (req, res) => aiProviderController.createProvider(req, res));
router.patch('/projects/:projectId/ai/providers/:providerId', (req, res) => aiProviderController.updateProvider(req, res));
router.delete('/projects/:projectId/ai/providers/:providerId', (req, res) => aiProviderController.deleteProvider(req, res));
router.post('/projects/:projectId/ai/providers/:providerId/test', (req, res) => aiProviderController.testProvider(req, res));
router.post('/projects/:projectId/ai/providers/:providerId/enable', (req, res) => aiProviderController.enableProvider(req, res));
router.post('/projects/:projectId/ai/providers/:providerId/disable', (req, res) => aiProviderController.disableProvider(req, res));
router.post('/projects/:projectId/ai/providers/:providerId/default', (req, res) => aiProviderController.setDefaultProvider(req, res));
router.post('/projects/:projectId/ai/providers/:providerId/estimate', (req, res) => aiProviderController.estimateProvider(req, res));
router.post('/projects/:projectId/ai/providers/:providerId/generate', (req, res) => aiProviderController.generateProvider(req, res));
router.get('/ai/providers/types', (req, res) => aiProviderController.listSupportedTypes(req, res));
router.get('/ai/providers/adapters', (req, res) => aiProviderController.listAdapters(req, res));

export { router as aiProviderRoutes };
export default router;