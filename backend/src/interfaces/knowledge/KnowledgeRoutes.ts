// KnowledgeRoutes - Route definitions for Knowledge Management
import { Router } from 'express';
import { KnowledgeController } from './KnowledgeController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repositories from the ApplicationContainer
const {
  knowledgeFlowRepository,
  businessRuleRepository,
  runtimeVariableRepository,
  dependencyRepository,
  documentationRepository,
} = container;

// Initialize use cases
import { CreateKnowledgeFlow } from '../../application/knowledge/CreateKnowledgeFlow';
import { UpdateKnowledgeFlow } from '../../application/knowledge/UpdateKnowledgeFlow';
import { DeleteKnowledgeFlow } from '../../application/knowledge/DeleteKnowledgeFlow';
import { GetKnowledgeFlow } from '../../application/knowledge/GetKnowledgeFlow';
import { ListKnowledgeFlows } from '../../application/knowledge/ListKnowledgeFlows';
import { ManageBusinessRules } from '../../application/knowledge/ManageBusinessRules';
import { ManageRuntimeVariables } from '../../application/knowledge/ManageRuntimeVariables';
import { ManageDependencies } from '../../application/knowledge/ManageDependencies';
import { ManageDocumentation } from '../../application/knowledge/ManageDocumentation';
import { asyncHandler } from '../middleware/AsyncHandler';

const createKnowledgeFlow = new CreateKnowledgeFlow(knowledgeFlowRepository);
const updateKnowledgeFlow = new UpdateKnowledgeFlow(knowledgeFlowRepository);
const deleteKnowledgeFlow = new DeleteKnowledgeFlow(knowledgeFlowRepository);
const getKnowledgeFlow = new GetKnowledgeFlow(knowledgeFlowRepository);
const listKnowledgeFlows = new ListKnowledgeFlows(knowledgeFlowRepository);
const manageBusinessRules = new ManageBusinessRules(businessRuleRepository);
const manageRuntimeVariables = new ManageRuntimeVariables(runtimeVariableRepository);
const manageDependencies = new ManageDependencies(dependencyRepository);
const manageDocumentation = new ManageDocumentation(documentationRepository);

// Initialize controller
const knowledgeController = new KnowledgeController(
  createKnowledgeFlow,
  updateKnowledgeFlow,
  deleteKnowledgeFlow,
  getKnowledgeFlow,
  listKnowledgeFlows,
  manageBusinessRules,
  manageRuntimeVariables,
  manageDependencies,
  manageDocumentation
);

const router = Router();

// Business Flow routes
router.get('/projects/:projectId/knowledge/flows', asyncHandler((req, res) => knowledgeController.listFlows(req, res)));
router.post('/projects/:projectId/knowledge/flows', asyncHandler((req, res) => knowledgeController.createFlow(req, res)));
router.get('/projects/:projectId/knowledge/flows/:flowId', asyncHandler((req, res) => knowledgeController.getFlow(req, res)));
router.patch('/projects/:projectId/knowledge/flows/:flowId', asyncHandler((req, res) => knowledgeController.updateFlow(req, res)));
router.delete('/projects/:projectId/knowledge/flows/:flowId', asyncHandler((req, res) => knowledgeController.deleteFlow(req, res)));

// Business Rules routes
router.get('/projects/:projectId/knowledge/rules', asyncHandler((req, res) => knowledgeController.listBusinessRules(req, res)));
router.post('/projects/:projectId/knowledge/rules', asyncHandler((req, res) => knowledgeController.createBusinessRule(req, res)));
router.get('/projects/:projectId/knowledge/rules/:ruleId', asyncHandler((req, res) => knowledgeController.getBusinessRule(req, res)));
router.patch('/projects/:projectId/knowledge/rules/:ruleId', asyncHandler((req, res) => knowledgeController.updateBusinessRule(req, res)));
router.delete('/projects/:projectId/knowledge/rules/:ruleId', asyncHandler((req, res) => knowledgeController.deleteBusinessRule(req, res)));

// Runtime Variables routes
router.get('/projects/:projectId/knowledge/variables', asyncHandler((req, res) => knowledgeController.listRuntimeVariables(req, res)));
router.post('/projects/:projectId/knowledge/variables', asyncHandler((req, res) => knowledgeController.createRuntimeVariable(req, res)));
router.get('/projects/:projectId/knowledge/variables/:variableId', asyncHandler((req, res) => knowledgeController.getRuntimeVariable(req, res)));
router.patch('/projects/:projectId/knowledge/variables/:variableId', asyncHandler((req, res) => knowledgeController.updateRuntimeVariable(req, res)));
router.delete('/projects/:projectId/knowledge/variables/:variableId', asyncHandler((req, res) => knowledgeController.deleteRuntimeVariable(req, res)));

// Dependencies routes
router.get('/projects/:projectId/knowledge/dependencies', asyncHandler((req, res) => knowledgeController.listDependencies(req, res)));
router.post('/projects/:projectId/knowledge/dependencies', asyncHandler((req, res) => knowledgeController.createDependency(req, res)));
router.get('/projects/:projectId/knowledge/dependencies/:dependencyId', asyncHandler((req, res) => knowledgeController.getDependency(req, res)));
router.patch('/projects/:projectId/knowledge/dependencies/:dependencyId', asyncHandler((req, res) => knowledgeController.updateDependency(req, res)));
router.delete('/projects/:projectId/knowledge/dependencies/:dependencyId', asyncHandler((req, res) => knowledgeController.deleteDependency(req, res)));

// Documentation routes
router.get('/projects/:projectId/knowledge/docs', asyncHandler((req, res) => knowledgeController.listDocumentation(req, res)));
router.post('/projects/:projectId/knowledge/docs', asyncHandler((req, res) => knowledgeController.createDocumentation(req, res)));
router.get('/projects/:projectId/knowledge/docs/:docId', asyncHandler((req, res) => knowledgeController.getDocumentation(req, res)));
router.patch('/projects/:projectId/knowledge/docs/:docId', asyncHandler((req, res) => knowledgeController.updateDocumentation(req, res)));
router.delete('/projects/:projectId/knowledge/docs/:docId', asyncHandler((req, res) => knowledgeController.deleteDocumentation(req, res)));

export { router as knowledgeRoutes };
export default router;