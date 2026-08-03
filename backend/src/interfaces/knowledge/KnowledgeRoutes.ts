// KnowledgeRoutes - Route definitions for Knowledge Management
import { Router } from 'express';
import { KnowledgeController } from './KnowledgeController';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { CreateKnowledgeFlow } from '../../application/knowledge/CreateKnowledgeFlow';
import { UpdateKnowledgeFlow } from '../../application/knowledge/UpdateKnowledgeFlow';
import { DeleteKnowledgeFlow } from '../../application/knowledge/DeleteKnowledgeFlow';
import { GetKnowledgeFlow } from '../../application/knowledge/GetKnowledgeFlow';
import { ListKnowledgeFlows } from '../../application/knowledge/ListKnowledgeFlows';
import { ManageBusinessRules } from '../../application/knowledge/ManageBusinessRules';
import { ManageRuntimeVariables } from '../../application/knowledge/ManageRuntimeVariables';
import { ManageDependencies } from '../../application/knowledge/ManageDependencies';
import { ManageDocumentation } from '../../application/knowledge/ManageDocumentation';
import { BusinessRuleRepository } from '../../infrastructure/knowledge/BusinessRuleRepository';
import { RuntimeVariableRepository } from '../../infrastructure/knowledge/RuntimeVariableRepository';
import { DependencyRepository } from '../../infrastructure/knowledge/DependencyRepository';
import { DocumentationRepository } from '../../infrastructure/knowledge/DocumentationRepository';

// Initialize repositories
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const businessRuleRepository = new BusinessRuleRepository();
const runtimeVariableRepository = new RuntimeVariableRepository();
const dependencyRepository = new DependencyRepository();
const documentationRepository = new DocumentationRepository();

// Initialize use cases
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
router.get('/projects/:projectId/knowledge/flows', (req, res) => knowledgeController.listFlows(req, res));
router.post('/projects/:projectId/knowledge/flows', (req, res) => knowledgeController.createFlow(req, res));
router.get('/projects/:projectId/knowledge/flows/:flowId', (req, res) => knowledgeController.getFlow(req, res));
router.patch('/projects/:projectId/knowledge/flows/:flowId', (req, res) => knowledgeController.updateFlow(req, res));
router.delete('/projects/:projectId/knowledge/flows/:flowId', (req, res) => knowledgeController.deleteFlow(req, res));

// Business Rules routes
router.get('/projects/:projectId/knowledge/rules', (req, res) => knowledgeController.listBusinessRules(req, res));
router.post('/projects/:projectId/knowledge/rules', (req, res) => knowledgeController.createBusinessRule(req, res));
router.get('/projects/:projectId/knowledge/rules/:ruleId', (req, res) => knowledgeController.getBusinessRule(req, res));
router.patch('/projects/:projectId/knowledge/rules/:ruleId', (req, res) => knowledgeController.updateBusinessRule(req, res));
router.delete('/projects/:projectId/knowledge/rules/:ruleId', (req, res) => knowledgeController.deleteBusinessRule(req, res));

// Runtime Variables routes
router.get('/projects/:projectId/knowledge/variables', (req, res) => knowledgeController.listRuntimeVariables(req, res));
router.post('/projects/:projectId/knowledge/variables', (req, res) => knowledgeController.createRuntimeVariable(req, res));
router.get('/projects/:projectId/knowledge/variables/:variableId', (req, res) => knowledgeController.getRuntimeVariable(req, res));
router.patch('/projects/:projectId/knowledge/variables/:variableId', (req, res) => knowledgeController.updateRuntimeVariable(req, res));
router.delete('/projects/:projectId/knowledge/variables/:variableId', (req, res) => knowledgeController.deleteRuntimeVariable(req, res));

// Dependencies routes
router.get('/projects/:projectId/knowledge/dependencies', (req, res) => knowledgeController.listDependencies(req, res));
router.post('/projects/:projectId/knowledge/dependencies', (req, res) => knowledgeController.createDependency(req, res));
router.get('/projects/:projectId/knowledge/dependencies/:dependencyId', (req, res) => knowledgeController.getDependency(req, res));
router.patch('/projects/:projectId/knowledge/dependencies/:dependencyId', (req, res) => knowledgeController.updateDependency(req, res));
router.delete('/projects/:projectId/knowledge/dependencies/:dependencyId', (req, res) => knowledgeController.deleteDependency(req, res));

// Documentation routes
router.get('/projects/:projectId/knowledge/docs', (req, res) => knowledgeController.listDocumentation(req, res));
router.post('/projects/:projectId/knowledge/docs', (req, res) => knowledgeController.createDocumentation(req, res));
router.get('/projects/:projectId/knowledge/docs/:docId', (req, res) => knowledgeController.getDocumentation(req, res));
router.patch('/projects/:projectId/knowledge/docs/:docId', (req, res) => knowledgeController.updateDocumentation(req, res));
router.delete('/projects/:projectId/knowledge/docs/:docId', (req, res) => knowledgeController.deleteDocumentation(req, res));

export { router as knowledgeRoutes };
export default router;