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
import { GenerateRequirementTestCases } from '../../application/requirements/GenerateRequirementTestCases';
import { ImportRequirementFromJira } from '../../application/requirements/ImportRequirementFromJira';
import { asyncHandler } from '../middleware/AsyncHandler';

const createRequirement = new CreateRequirement(requirementRepository);
const importRequirementFromJira = new ImportRequirementFromJira(createRequirement);
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

const generateRequirementTestCases = new GenerateRequirementTestCases(
  requirementRepository,
  testStrategyRepository,
  testDesignRepository,
  apiOperationRepository,
  planTestStrategy,
  generateTestDesigns,
  generateTestDesignWithAI,
  planExecution,
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
  planExecution,
  generateRequirementTestCases,
  importRequirementFromJira,
  testDesignRepository,
  executionPlanRepository,
);

const router = Router();

// Requirement routes
router.get('/projects/:projectId/requirements', asyncHandler((req, res) => requirementController.listRequirements(req, res)));
router.post('/projects/:projectId/requirements', asyncHandler((req, res) => requirementController.createRequirement(req, res)));
router.post('/projects/:projectId/requirements/from-jira', asyncHandler((req, res) => requirementController.importFromJira(req, res)));
router.get('/projects/:projectId/requirements/:requirementId', asyncHandler((req, res) => requirementController.getRequirement(req, res)));
router.patch('/projects/:projectId/requirements/:requirementId', asyncHandler((req, res) => requirementController.updateRequirement(req, res)));
router.delete('/projects/:projectId/requirements/:requirementId', asyncHandler((req, res) => requirementController.deleteRequirement(req, res)));
router.post('/projects/:projectId/requirements/generate-ai', asyncHandler((req, res) => aiRequirementController.generateWithAI(req, res)));
router.post('/projects/:projectId/requirements/:requirementId/strategy-ai', asyncHandler((req, res) => aiRequirementController.generateStrategyWithAI(req, res)));
router.post('/projects/:projectId/requirements/:requirementId/designs-ai', asyncHandler((req, res) => aiRequirementController.generateDesignWithAI(req, res)));
router.post('/projects/:projectId/requirements/:requirementId/execution-plans-ai', asyncHandler((req, res) => aiRequirementController.generateExecutionPlanAI(req, res)));
router.post('/projects/:projectId/test-designs/:testDesignId/assertions-ai', asyncHandler((req, res) => aiRequirementController.generateAssertionsWithAI(req, res)));
router.post('/projects/:projectId/requirements/from-analysis/:analysisId', asyncHandler((req, res) => requirementController.generateFromAnalysis(req, res)));
router.get('/projects/:projectId/requirements/:requirementId/validate', asyncHandler((req, res) => requirementController.validateReadiness(req, res)));
router.post('/projects/:projectId/requirements/:requirementId/generate-test-cases', asyncHandler((req, res) => requirementController.generateTestCases(req, res)));
router.post('/projects/:projectId/requirements/:requirementId/strategy', asyncHandler((req, res) => requirementController.planTestStrategy(req, res)));
router.post('/projects/:projectId/requirements/:requirementId/designs', asyncHandler((req, res) => requirementController.generateTestDesigns(req, res)));
router.get('/projects/:projectId/requirements/:requirementId/test-designs', asyncHandler((req, res) => requirementController.listTestDesigns(req, res)));
router.patch('/projects/:projectId/test-designs/:testDesignId', asyncHandler((req, res) => requirementController.updateTestDesign(req, res)));
router.post('/projects/:projectId/requirements/:requirementId/execution-plans', asyncHandler((req, res) => requirementController.planExecution(req, res)));
router.get('/projects/:projectId/requirements/:requirementId/execution-plans', asyncHandler((req, res) => requirementController.listExecutionPlansForRequirement(req, res)));
router.patch('/projects/:projectId/execution-plans/:executionPlanId', asyncHandler((req, res) => requirementController.updateExecutionPlan(req, res)));

export { router as requirementRoutes };
export default router;