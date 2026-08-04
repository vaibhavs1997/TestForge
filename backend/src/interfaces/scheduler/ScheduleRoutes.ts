// ScheduleRoutes - Route definitions for Scheduler Module
import { Router } from 'express';
import { ScheduleController } from './ScheduleController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repositories and services from the ApplicationContainer
const {
  scheduleRepository,
  testSuiteRepository,
  executionRunRepository,
  executionPlanRepository,
  requirementRepository,
  testDesignRepository,
  environmentRepository,
  datasetRepository,
  dataSourceMappingRepository,
  datasetRowRepository,
  apiOperationRepository,
  assertionRepository,
  executionProfileRepository,
  executePlan,
  schedulerService,
} = container;

// Initialize use cases
import { CreateSchedule } from '../../application/scheduler/CreateSchedule';
import { UpdateSchedule } from '../../application/scheduler/UpdateSchedule';
import { GetSchedule, ListSchedules, DeleteSchedule } from '../../application/scheduler/ManageSchedules';

const createSchedule = new CreateSchedule(scheduleRepository, testSuiteRepository);
const updateSchedule = new UpdateSchedule(scheduleRepository, testSuiteRepository);
const getSchedule = new GetSchedule(scheduleRepository);
const listSchedules = new ListSchedules(scheduleRepository);
const deleteSchedule = new DeleteSchedule(scheduleRepository);

// Initialize controller
const scheduleController = new ScheduleController(
  createSchedule,
  updateSchedule,
  getSchedule,
  listSchedules,
  deleteSchedule,
  schedulerService
);

const router = Router();

// Schedule routes
router.get('/projects/:projectId/schedules', (req, res) => scheduleController.listSchedules(req, res));
router.post('/projects/:projectId/schedules', (req, res) => scheduleController.createSchedule(req, res));
router.get('/projects/:projectId/schedules/:scheduleId', (req, res) => scheduleController.getSchedule(req, res));
router.patch('/projects/:projectId/schedules/:scheduleId', (req, res) => scheduleController.updateSchedule(req, res));
router.delete('/projects/:projectId/schedules/:scheduleId', (req, res) => scheduleController.deleteSchedule(req, res));
router.post('/projects/:projectId/schedules/:scheduleId/run', (req, res) => scheduleController.runNow(req, res));
router.post('/projects/:projectId/schedules/:scheduleId/enable', (req, res) => scheduleController.enableSchedule(req, res));
router.post('/projects/:projectId/schedules/:scheduleId/disable', (req, res) => scheduleController.disableSchedule(req, res));

export { router as scheduleRoutes };
export default router;