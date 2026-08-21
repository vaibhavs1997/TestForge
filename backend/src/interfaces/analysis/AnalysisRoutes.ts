// AnalysisRoutes - Route definitions for AI Project Analysis
import { Router } from 'express';
import { AnalysisController } from './AnalysisController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repositories and use cases from the ApplicationContainer
const {
  analysisRepository,
  apiServiceRepository,
  apiOperationRepository,
  knowledgeFlowRepository,
  datasetRepository,
} = container;

// Initialize use cases
import { CreateAnalysis } from '../../application/analysis/CreateAnalysis.js';
import { UpdateAnalysis } from '../../application/analysis/UpdateAnalysis.js';
import { DeleteAnalysis } from '../../application/analysis/DeleteAnalysis.js';
import { GetAnalysis } from '../../application/analysis/GetAnalysis.js';
import { ListAnalysis } from '../../application/analysis/ListAnalysis.js';
import { AnalyzeProject } from '../../application/analysis/AnalyzeProject.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const createAnalysis = new CreateAnalysis(analysisRepository);
const updateAnalysis = new UpdateAnalysis(analysisRepository);
const deleteAnalysis = new DeleteAnalysis(analysisRepository);
const getAnalysis = new GetAnalysis(analysisRepository);
const listAnalysis = new ListAnalysis(analysisRepository);
const analyzeProject = new AnalyzeProject(
  analysisRepository,
  apiServiceRepository,
  apiOperationRepository,
  knowledgeFlowRepository,
  datasetRepository
);

// Initialize controller
const analysisController = new AnalysisController(
  createAnalysis,
  updateAnalysis,
  deleteAnalysis,
  getAnalysis,
  listAnalysis,
  analyzeProject
);

const router = Router();

// Analysis routes
router.get('/projects/:projectId/analysis', asyncHandler((req, res) => analysisController.listAnalysis(req, res)));
router.post('/projects/:projectId/analysis', asyncHandler((req, res) => analysisController.createAnalysis(req, res)));
router.get('/projects/:projectId/analysis/:analysisId', asyncHandler((req, res) => analysisController.getAnalysis(req, res)));
router.patch('/projects/:projectId/analysis/:analysisId', asyncHandler((req, res) => analysisController.updateAnalysis(req, res)));
router.delete('/projects/:projectId/analysis/:analysisId', asyncHandler((req, res) => analysisController.deleteAnalysis(req, res)));
router.post('/projects/:projectId/analysis/run', asyncHandler((req, res) => analysisController.analyzeProject(req, res)));

export { router as analysisRoutes };
export default router;