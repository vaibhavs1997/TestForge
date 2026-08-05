// AssertionRoutes - Route definitions for Assertion Library

import { Router } from 'express';
import { AssertionController } from './AssertionController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repository from the ApplicationContainer
const { assertionRepository } = container;

// Initialize use case
import { ManageAssertions } from '../../application/assertion/ManageAssertions';

const manageAssertions = new ManageAssertions(assertionRepository);

// Initialize controller
const assertionController = new AssertionController(manageAssertions);

const router = Router();

// Assertion routes
router.post('/projects/:projectId/assertions', (req, res) => assertionController.createAssertion(req, res));
router.put('/projects/:projectId/assertions/:id', (req, res) => assertionController.updateAssertion(req, res));
router.delete('/projects/:projectId/assertions/:id', (req, res) => assertionController.deleteAssertion(req, res));
router.get('/projects/:projectId/assertions/:id', (req, res) => assertionController.getAssertion(req, res));
router.get('/projects/:projectId/assertions', (req, res) => assertionController.listAssertions(req, res));
router.get('/projects/:projectId/assertions/search', (req, res) => assertionController.searchAssertions(req, res));
router.patch('/projects/:projectId/assertions/:id/toggle', (req, res) => assertionController.toggleAssertion(req, res));
router.post('/projects/:projectId/assertions/:id/duplicate', (req, res) => assertionController.duplicateAssertion(req, res));

export { router as assertionRoutes };
export default router;