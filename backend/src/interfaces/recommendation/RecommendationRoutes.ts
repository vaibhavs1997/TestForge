// RecommendationRoutes - Route definitions for Recommendation Engine
import { Router } from 'express';
import { RecommendationController } from './RecommendationController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared service from the ApplicationContainer
const { recommendationEngine } = container;

// Initialize controller
const recommendationController = new RecommendationController(
  recommendationEngine
);

const router = Router();

// Recommendation routes
router.get('/projects/:projectId/analyze', (req, res) => recommendationController.analyzeProject(req, res));

export { router as recommendationRoutes };
export default router;