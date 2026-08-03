// ScheduleController - Controller for Scheduler Module endpoints
import { Request, Response } from 'express';
import { CreateSchedule } from '../../application/scheduler/CreateSchedule';
import { UpdateSchedule } from '../../application/scheduler/UpdateSchedule';
import { GetSchedule, ListSchedules, DeleteSchedule } from '../../application/scheduler/ManageSchedules';
import { SchedulerService } from '../../application/scheduler/SchedulerService';

export class ScheduleController {
  constructor(
    private readonly createScheduleUseCase: CreateSchedule,
    private readonly updateScheduleUseCase: UpdateSchedule,
    private readonly getScheduleUseCase: GetSchedule,
    private readonly listSchedulesUseCase: ListSchedules,
    private readonly deleteScheduleUseCase: DeleteSchedule,
    private readonly schedulerService: SchedulerService
  ) {}

  async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const schedule = await this.createScheduleUseCase.execute({
        projectId,
        ...req.body,
      });
      res.status(201).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('already exists') || error.message.includes('disabled')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, scheduleId } = req.params;
      const schedule = await this.updateScheduleUseCase.execute({
        id: scheduleId,
        projectId,
        ...req.body,
      });
      res.status(200).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('already exists') || error.message.includes('disabled')) {
        res.status(400).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      const schedule = await this.getScheduleUseCase.execute(scheduleId);
      res.status(200).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async listSchedules(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const schedules = await this.listSchedulesUseCase.execute(projectId);
      res.status(200).json({ success: true, data: schedules });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      await this.deleteScheduleUseCase.execute(scheduleId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async runNow(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      const schedule = await this.schedulerService.runNow(scheduleId);
      res.status(200).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else if (error.message.includes('already running')) {
        res.status(409).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async enableSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, scheduleId } = req.params;
      const schedule = await this.updateScheduleUseCase.execute({
        id: scheduleId,
        projectId,
        enabled: true,
      });
      res.status(200).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }

  async disableSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, scheduleId } = req.params;
      const schedule = await this.updateScheduleUseCase.execute({
        id: scheduleId,
        projectId,
        enabled: false,
      });
      res.status(200).json({ success: true, data: schedule });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        res.status(404).json({ success: false, message: error.message, details: null });
      } else {
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
      }
    }
  }
}

export default ScheduleController;