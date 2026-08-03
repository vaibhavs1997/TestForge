// ScheduleRoutes - Route definitions for Scheduler Module
import { Router } from 'express';
import { ScheduleController } from './ScheduleController';
import { ScheduleRepository } from '../../infrastructure/scheduler/ScheduleRepository';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository';
import { CreateSchedule } from '../../application/scheduler/CreateSchedule';
import { UpdateSchedule } from '../../application/scheduler/UpdateSchedule';
import { GetSchedule, ListSchedules, DeleteSchedule } from '../../application/scheduler/ManageSchedules';
import { SchedulerService } from '../../application/scheduler/SchedulerService';
import { ExecutePlan } from '../../application/execution/ExecutePlan';
import { ExecutionRunRepository } from '../../infrastructure/execution/ExecutionRunRepository';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';
import { RequirementRepository } from '../../infrastructure/requirements/RequirementRepository';
import { TestDesignRepository } from '../../infrastructure/requirements/TestDesignRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { DataSourceMappingRepository } from '../../infrastructure/test-data/DataSourceMappingRepository';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import { ExecutionProfileRepository } from '../../infrastructure/execution/ExecutionProfileRepository';
import { EventBus } from '../../domain/events/EventBus';

// Initialize repositories
const scheduleRepository = new ScheduleRepository();
const testSuiteRepository = new TestSuiteRepository();
const executionRunRepository = new ExecutionRunRepository();
const executionPlanRepository = new ExecutionPlanRepository();
const requirementRepository = new RequirementRepository();
const testDesignRepository = new TestDesignRepository();
const environmentRepository = new EnvironmentRepository();
const datasetRepository = new DatasetRepository();
const dataSourceMappingRepository = new DataSourceMappingRepository();
const datasetRowRepository = new DatasetRowRepository();
const apiOperationRepository = new ApiOperationRepository();
const assertionRepository = new AssertionRepository();
const executionProfileRepository = new ExecutionProfileRepository();

// Reuse the existing Execution Engine (same as manual execution)
const executePlan = new ExecutePlan(
  executionRunRepository,
  executionPlanRepository,
  requirementRepository,
  environmentRepository,
  datasetRepository,
  apiOperationRepository,
  dataSourceMappingRepository,
  datasetRowRepository,
  testDesignRepository,
  assertionRepository,
  executionProfileRepository
);

// Initialize use cases
const createSchedule = new CreateSchedule(scheduleRepository, testSuiteRepository);
const updateSchedule = new UpdateSchedule(scheduleRepository, testSuiteRepository);
const getSchedule = new GetSchedule(scheduleRepository);
const listSchedules = new ListSchedules(scheduleRepository);
const deleteSchedule = new DeleteSchedule(scheduleRepository);

// Initialize scheduler service (reuses the existing Execution Engine)
const eventBus = new EventBus();
const schedulerService = new SchedulerService(scheduleRepository, testSuiteRepository, executePlan, eventBus);

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