// KnowledgeRoutes - Route definitions for Knowledge Management
import { Router } from 'express';
import { KnowledgeController } from './KnowledgeController';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { CreateKnowledgeFlow } from '../../application/knowledge/CreateKnowledgeFlow';
import { UpdateKnowledgeFlow } from '../../application/knowledge/UpdateKnowledgeFlow';
import { DeleteKnowledgeFlow } from '../../application/knowledge/DeleteKnowledgeFlow';
import { GetKnowledgeFlow } from '../../application/knowledge/GetKnowledgeFlow';
import { ListKnowledgeFlows } from '../../application/knowledge/ListKnowledgeFlows';

// Initialize repositories
const knowledgeFlowRepository = new KnowledgeFlowRepository();

// Initialize use cases
const createKnowledgeFlow = new CreateKnowledgeFlow(knowledgeFlowRepository);
const updateKnowledgeFlow = new UpdateKnowledgeFlow(knowledgeFlowRepository);
const deleteKnowledgeFlow = new DeleteKnowledgeFlow(knowledgeFlowRepository);
const getKnowledgeFlow = new GetKnowledgeFlow(knowledgeFlowRepository);
const listKnowledgeFlows = new ListKnowledgeFlows(knowledgeFlowRepository);

// Initialize controller
const knowledgeController = new KnowledgeController(
  createKnowledgeFlow,
  updateKnowledgeFlow,
  deleteKnowledgeFlow,
  getKnowledgeFlow,
  listKnowledgeFlows
);

const router = Router();

// Knowledge Flow routes
router.get('/projects/:projectId/knowledge/flows', (req, res) => knowledgeController.listFlows(req, res));
router.post('/projects/:projectId/knowledge/flows', (req, res) => knowledgeController.createFlow(req, res));
router.get('/projects/:projectId/knowledge/flows/:flowId', (req, res) => knowledgeController.getFlow(req, res));
router.patch('/projects/:projectId/knowledge/flows/:flowId', (req, res) => knowledgeController.updateFlow(req, res));
router.delete('/projects/:projectId/knowledge/flows/:flowId', (req, res) => knowledgeController.deleteFlow(req, res));

export { router as knowledgeRoutes };
export default router;