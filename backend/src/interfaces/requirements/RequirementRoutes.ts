// RequirementRoutes - Route definitions for Requirement Workspace
import { Router } from 'express';
import { RequirementController } from './RequirementController';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { CreateRequirement } from '../../application/requirements/CreateRequirement';
import { UpdateRequirement } from '../../application/requirements/UpdateRequirement';
import { DeleteRequirement } from '../../application/requirements/DeleteRequirement';
import { GetRequirement } from '../../application/requirements/GetRequirement';
import { ListRequirements } from '../../application/requirements/ListRequirements';
import { GenerateFromAnalysis } from '../../application/requirements/GenerateFromAnalysis';
import { ValidateRequirementReadiness } from '../../application/requirements/ValidateRequirementReadiness';
import { PlanTestStrategy } from '../../application/requirements/PlanTestStrategy';
import { GenerateTestDesigns } from '../../application/requirements/GenerateTestDesigns';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { TestStrategyRepository } from '../../infrastructure/requirements/TestStrategyRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';

// Initialize repositories
const requirementRepository = new RequirementRepository();
const analysisRepository = new AnalysisRepository();
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const datasetRepository = new DatasetRepository();
const environmentRepository = new EnvironmentRepository();
const apiServiceRepository = new ApiServiceRepository();
const apiOperationRepository = new ApiOperationRepository();
const testStrategyRepository = new TestStrategyRepository();
const testDesignRepository = new TestDesignRepository();

// Initialize use cases
const createRequirement = new CreateRequirement(requirementRepository);
const updateRequirement = new UpdateRequirement(requirementRepository);
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
  generateTestDesigns
);

const router = Router();

// Requirement routes
router.get('/projects/:projectId/requirements', (req, res) => requirementController.listRequirements(req, res));
router.post('/projects/:projectId/requirements', (req, res) => requirementController.createRequirement(req, res));
router.get('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.getRequirement(req, res));
router.patch('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.updateRequirement(req, res));
router.delete('/projects/:projectId/requirements/:requirementId', (req, res) => requirementController.deleteRequirement(req, res));
router.post('/projects/:projectId/requirements/from-analysis/:analysisId', (req, res) => requirementController.generateFromAnalysis(req, res));
router.get('/projects/:projectId/requirements/:requirementId/validate', (req, res) => requirementController.validateReadiness(req, res));
router.post('/projects/:projectId/requirements/:requirementId/strategy', (req, res) => requirementController.planTestStrategy(req, res));
router.post('/projects/:projectId/requirements/:requirementId/designs', (req, res) => requirementController.generateTestDesigns(req, res));

export { router as requirementRoutes };
export default router;