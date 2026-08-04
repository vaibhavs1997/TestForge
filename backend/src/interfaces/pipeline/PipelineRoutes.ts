// PipelineRoutes - Route definitions for Pipeline Orchestration
import { Router } from 'express';
import { PipelineController } from './PipelineController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared use cases from the ApplicationContainer
const {
  orchestratePipeline,
  runAIPipeline,
} = container;

// Initialize controller
const pipelineController = new PipelineController(
  orchestratePipeline,
  runAIPipeline
);

const router = Router();

// Pipeline routes
router.post('/projects/:projectId/pipeline', (req, res) => pipelineController.startPipeline(req, res));
router.post('/projects/:projectId/pipeline/ai', (req, res) => pipelineController.runAIPipelineHandler(req, res));
router.get('/projects/:projectId/pipelines', (req, res) => pipelineController.getProjectPipelines(req, res));
router.get('/pipelines/:pipelineId', (req, res) => pipelineController.getPipelineStatus(req, res));
router.post('/pipelines/:pipelineId/restart', (req, res) => pipelineController.restartFailedStage(req, res));
router.post('/pipelines/:pipelineId/cancel', (req, res) => pipelineController.cancelPipeline(req, res));

export { router as pipelineRoutes };
export default router;