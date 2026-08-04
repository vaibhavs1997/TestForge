// RequirementRoutes - Route definitions for Requirement Workspace
import { Router } from 'express';
import { RequirementController } from './RequirementController';
import { AIRequirementController } from './AIRequirementController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared use cases from the ApplicationContainer
const {
  requirementRepository,
  analysisRepository,
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiServiceRepository,
  apiOperationRepository,
  testStrategyRepository,
  testDesignRepository,
  executionPlanRepository,
  generateRequirementsWithAI,
  generateTestStrategyWithAI,
  generateTestDesignWithAI,
  generateAssertionsWithAI,
  generateExecutionPlanWithAI,
  eventPublisher,
} = container;

// Initialize use cases
import { CreateRequirement } from '../../application/requirements/CreateRequirement';
import { UpdateRequirement } from '../../application/requirements/UpdateRequirement';
import { DeleteRequirement } from '../../application/requirements/DeleteRequirement';
import { GetRequirement } from '../../application/requirements/GetRequirement';
import { ListRequirements } from '../../application/requirements/ListRequirements';
import { GenerateFromAnalysis } from '../../application/requirements/GenerateFromAnalysis';
import { ValidateRequirementReadiness } from '../../application/requirements/ValidateRequirementReadiness';
import { PlanTestStrategy } from '../../application/requirements/PlanTestStrategy';
import { GenerateTestDesigns } from '../../application/requirements/GenerateTestDesigns';
import { PlanExecution } from '../../application/requirements/PlanExecution';

const createRequirement = new CreateRequirement(requirementRepository);
const updateRequirement = new UpdateRequirement(requirementRepository, eventPublisher);
const deleteRequirement = new DeleteRequirement(requirementRepository);
const getRequirement = new GetRequirement(requirementRepository);
const listRequirements = new ListRequirements(requirementRepository);
const generateFromAnalysis = new GenerateFromAnalysis(requirementRepository, analysisRepository);
const validateRequirementReadiness = new ValidateRequirementReadiness(
  requirementRepository,
  analysisRepository,
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiServiceRepository,
  apiOperationRepository
);

const planTestStrategy = new PlanTestStrategy(
  requirementRepository,
  analysisRepository,
  knowledgeFlowRepository,
  apiOperationRepository,
  testStrategyRepository
);

const generateTestDesigns = new GenerateTestDesigns(
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  analysisRepository,
  knowledgeFlowRepository,
  datasetRepository,
  environmentRepository,
  apiOperationRepository
);

const planExecution = new PlanExecution(
  requirementRepository,
  testDesignRepository,
  executionPlanRepository,
  knowledgeFlowRepository,
  apiOperationRepository
);

// AI requirement generation (reused from container)
const aiRequirementController = new AIRequirementController(
  generateRequirementsWithAI,
  generateTestStrategyWithAI,
  generateTestDesignWithAI,
  generateAssertionsWithAI,
  generateExecutionPlanWithAI
);

// Initialize controller
const requirementController = new RequirementController(
  createRequirement,
  updateRequirement,
  deleteRequirement,
  getRequirement,
  listRequirements,
  generateFromAnalysis,
  validateRequirementReadiness,
  planTestStrategy,
  generateTestDesigns,
  planExecution
);

const router = Router();

// Requirement routes
router.get('/projects/:projectId/requirements', (req, res) => requirementController.listRequirements(req, res));
router.post('/projects/:projectId/requirements', (req, res) => requirementController.createRequirement(req, res));
router.get('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.getRequirement(req, res));
router.patch('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.updateRequirement(req, res));
router.delete('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.deleteRequirement(req, res));
router.post('/projects/:projectId/requirements/generate-ai', (req, res) => aiRequirementController.generateWithAI(req, res));
router.post('/projects/:projectId/requirements/:requirementId/strategy-ai', (req, res) => aiRequirementController.generateStrategyWithAI(req, res));
router.post('/projects/:projectId/requirements/:requirementId/designs-ai', (req, res) => aiRequirementController.generateDesignWithAI(req, res));
router.post('/projects/:projectId/requirements/:requirementId/execution-plans-ai', (req, res) => aiRequirementController.generateExecutionPlanAI(req, res));
router.post('/projects/:projectId/test-designs/:testDesignId/assertions-ai', (req, res) => aiRequirementController.generateAssertionsWithAI(req, res));
router.post('/projects/:projectId/requirements/from-analysis/:analysisId', (req, res) => requirementController.generateFromAnalysis(req, res));
router.get('/projects/:projectId/requirements/:requirementId/validate', (req, res) => requirementController.validateReadiness(req, res));
router.post('/projects/:projectId/requirements/:requirementId/strategy', (req, res) => requirementController.planTestStrategy(req, res));
router.post('/projects/:projectId/requirements/:requirementId/designs', (req, res) => requirementController.generateTestDesigns(req, res));
router.post('/projects/:projectId/requirements/:requirementId/execution-plans', (req, res) => requirementController.planExecution(req, res));

export { router as requirementRoutes };
export default router;