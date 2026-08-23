// RecommendationRoutes - Route definitions for Recommendation Engine
import { Router } from 'express';
import { RecommendationController } from './RecommendationController.js';
import { container } from '../../application/ApplicationContainer.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

// Reuse shared service from the ApplicationContainer
const { recommendationEngine } = container;

// Initialize controller
const recommendationController = new RecommendationController(
  recommendationEngine
);

const router = Router();

// Recommendation routes
router.get('/projects/:projectId/analyze', asyncHandler((req, res) => recommendationController.analyzeProject(req, res)));

export { router as recommendationRoutes };
export default router;