// RelationshipRoutes - Route definitions for Dataset Relationships
import { Router } from 'express';
import { RelationshipController } from './RelationshipController';
import { RelationshipRepository } from '../../infrastructure/test-data/RelationshipRepository';

// Initialize repository
const relationshipRepository = new RelationshipRepository();

// Initialize controller
const relationshipController = new RelationshipController(relationshipRepository);

const router = Router();

// Relationship routes
router.get('/projects/:projectId/relationships', (req, res) => relationshipController.listByProject(req, res));
router.get('/projects/:projectId/datasets/:datasetId/relationships', (req, res) => relationshipController.listByDataset(req, res));
router.post('/projects/:projectId/relationships', (req, res) => relationshipController.create(req, res));
router.patch('/projects/:projectId/relationships/:relationshipId', (req, res) => relationshipController.update(req, res));
router.delete('/projects/:projectId/relationships/:relationshipId', (req, res) => relationshipController.delete(req, res));

export { router as relationshipRoutes };
export default router;