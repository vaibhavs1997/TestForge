// PromptRoutes - Route definitions for Prompt Builder module
import { Router } from 'express';
import { PromptController } from './PromptController.js';
import { container } from '../../application/ApplicationContainer.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

// Reuse shared service from the ApplicationContainer
const { promptBuilderService } = container;

const promptController = new PromptController(promptBuilderService);

const router = Router();

// Prompt Builder routes
router.get('/projects/:projectId/prompts', asyncHandler((req, res) => promptController.listPrompts(req, res)));
router.get('/projects/:projectId/prompts/templates', asyncHandler((req, res) => promptController.listTemplates(req, res)));
router.post('/projects/:projectId/prompts/build', asyncHandler((req, res) => promptController.buildPrompt(req, res)));
router.post('/projects/:projectId/prompts/preview', asyncHandler((req, res) => promptController.previewPrompt(req, res)));
router.get('/projects/:projectId/prompts/:promptId', asyncHandler((req, res) => promptController.getPrompt(req, res)));
router.delete('/projects/:projectId/prompts/:promptId', asyncHandler((req, res) => promptController.deletePrompt(req, res)));

export { router as promptRoutes };
export default router;