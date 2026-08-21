// RelationshipRoutes - Route definitions for Dataset Relationships
import { Router } from 'express';
import { RelationshipController } from './RelationshipController.js';
import { container } from '../../application/ApplicationContainer.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

// Reuse shared repository from the ApplicationContainer
const { relationshipRepository } = container;

// Initialize controller
const relationshipController = new RelationshipController(relationshipRepository);

const router = Router();

// Relationship routes
router.get('/projects/:projectId/relationships', asyncHandler((req, res) => relationshipController.listByProject(req, res)));
router.get('/projects/:projectId/datasets/:datasetId/relationships', asyncHandler((req, res) => relationshipController.listByDataset(req, res)));
router.post('/projects/:projectId/relationships', asyncHandler((req, res) => relationshipController.create(req, res)));
router.patch('/projects/:projectId/relationships/:relationshipId', asyncHandler((req, res) => relationshipController.update(req, res)));
router.delete('/projects/:projectId/relationships/:relationshipId', asyncHandler((req, res) => relationshipController.delete(req, res)));

export { router as relationshipRoutes };
export default router;