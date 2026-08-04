// PromptRoutes - Route definitions for Prompt Builder module
import { Router } from 'express';
import { PromptController } from './PromptController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared service from the ApplicationContainer
const { promptBuilderService } = container;

const promptController = new PromptController(promptBuilderService);

const router = Router();

// Prompt Builder routes
router.get('/projects/:projectId/prompts', (req, res) => promptController.listPrompts(req, res));
router.get('/projects/:projectId/prompts/templates', (req, res) => promptController.listTemplates(req, res));
router.post('/projects/:projectId/prompts/build', (req, res) => promptController.buildPrompt(req, res));
router.post('/projects/:projectId/prompts/preview', (req, res) => promptController.previewPrompt(req, res));
router.get('/projects/:projectId/prompts/:promptId', (req, res) => promptController.getPrompt(req, res));
router.delete('/projects/:projectId/prompts/:promptId', (req, res) => promptController.deletePrompt(req, res));

export { router as promptRoutes };
export default router;