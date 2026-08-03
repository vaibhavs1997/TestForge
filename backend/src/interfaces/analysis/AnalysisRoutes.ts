// AnalysisRoutes - Route definitions for AI Project Analysis
import { Router } from 'express';
import { AnalysisController } from './AnalysisController';
import { AnalysisRepository } from '../../infrastructure/analysis/AnalysisRepository';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { KnowledgeFlowRepository } from '../../infrastructure/knowledge/KnowledgeFlowRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { CreateAnalysis } from '../../application/analysis/CreateAnalysis';
import { UpdateAnalysis } from '../../application/analysis/UpdateAnalysis';
import { DeleteAnalysis } from '../../application/analysis/DeleteAnalysis';
import { GetAnalysis } from '../../application/analysis/GetAnalysis';
import { ListAnalysis } from '../../application/analysis/ListAnalysis';
import { AnalyzeProject } from '../../application/analysis/AnalyzeProject';

// Initialize repositories
const analysisRepository = new AnalysisRepository();
const apiServiceRepository = new ApiServiceRepository();
const apiOperationRepository = new ApiOperationRepository();
const knowledgeFlowRepository = new KnowledgeFlowRepository();
const datasetRepository = new DatasetRepository();

// Initialize use cases
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
router.get('/projects/:projectId/analysis', (req, res) => analysisController.listAnalysis(req, res));
router.post('/projects/:projectId/analysis', (req, res) => analysisController.createAnalysis(req, res));
router.get('/projects/:projectId/analysis/:analysisId', (req, res) => analysisController.getAnalysis(req, res));
router.patch('/projects/:projectId/analysis/:analysisId', (req, res) => analysisController.updateAnalysis(req, res));
router.delete('/projects/:projectId/analysis/:analysisId', (req, res) => analysisController.deleteAnalysis(req, res));
router.post('/projects/:projectId/analysis/run', (req, res) => analysisController.analyzeProject(req, res));

export { router as analysisRoutes };
export default router;