// PipelineRoutes - Route definitions for Pipeline Orchestration
import { Router } from 'express';
import { PipelineController } from './PipelineController';
import { container } from '../../application/ApplicationContainer';
import { asyncHandler } from '../middleware/AsyncHandler';

// Reuse shared use cases from the ApplicationContainer
const {
  orchestratePipeline,
  runAIPipeline,
  pipelineRepository,
} = container;

// Initialize controller
const pipelineController = new PipelineController(
  orchestratePipeline,
  runAIPipeline,
  pipelineRepository
);

const router = Router();

// Pipeline routes
router.post('/projects/:projectId/pipeline', asyncHandler((req, res) => pipelineController.startPipeline(req, res)));
router.post('/projects/:projectId/pipeline/ai', asyncHandler((req, res) => pipelineController.runAIPipelineHandler(req, res)));
router.get('/projects/:projectId/pipelines', asyncHandler((req, res) => pipelineController.getProjectPipelines(req, res)));
router.get('/pipelines/:pipelineId', asyncHandler((req, res) => pipelineController.getPipelineStatus(req, res)));
router.post('/pipelines/:pipelineId/restart', asyncHandler((req, res) => pipelineController.restartFailedStage(req, res)));
router.post('/pipelines/:pipelineId/cancel', asyncHandler((req, res) => pipelineController.cancelPipeline(req, res)));

export { router as pipelineRoutes };
export default router;
