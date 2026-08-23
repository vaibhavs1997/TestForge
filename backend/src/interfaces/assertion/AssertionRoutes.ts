// AssertionRoutes - Route definitions for Assertion Library

import { Router } from 'express';
import { AssertionController } from './AssertionController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repository from the ApplicationContainer
const { assertionRepository } = container;

// Initialize use case
import { ManageAssertions } from '../../application/assertion/ManageAssertions.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const manageAssertions = new ManageAssertions(assertionRepository);

// Initialize controller
const assertionController = new AssertionController(manageAssertions);

const router = Router();

// Assertion routes
router.post('/projects/:projectId/assertions', asyncHandler((req, res) => assertionController.createAssertion(req, res)));
router.post('/projects/:projectId/assertions/preview', asyncHandler((req, res) => assertionController.previewAssertion(req, res)));
router.put('/projects/:projectId/assertions/:id', asyncHandler((req, res) => assertionController.updateAssertion(req, res)));
router.delete('/projects/:projectId/assertions/:id', asyncHandler((req, res) => assertionController.deleteAssertion(req, res)));
router.get('/projects/:projectId/assertions/:id', asyncHandler((req, res) => assertionController.getAssertion(req, res)));
router.get('/projects/:projectId/assertions', asyncHandler((req, res) => assertionController.listAssertions(req, res)));
router.get('/projects/:projectId/assertions/search', asyncHandler((req, res) => assertionController.searchAssertions(req, res)));
router.patch('/projects/:projectId/assertions/:id/toggle', asyncHandler((req, res) => assertionController.toggleAssertion(req, res)));
router.post('/projects/:projectId/assertions/:id/duplicate', asyncHandler((req, res) => assertionController.duplicateAssertion(req, res)));

export { router as assertionRoutes };
export default router;
