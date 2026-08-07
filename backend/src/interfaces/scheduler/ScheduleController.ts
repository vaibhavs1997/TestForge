// ScheduleController - Controller for Scheduler Module endpoints
import { Request, Response } from 'express';
import { CreateSchedule } from '../../application/scheduler/CreateSchedule';
import { UpdateSchedule } from '../../application/scheduler/UpdateSchedule';
import { GetSchedule, ListSchedules, DeleteSchedule } from '../../application/scheduler/ManageSchedules';
import { SchedulerService } from '../../application/scheduler/SchedulerService';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class ScheduleController {
    constructor(private readonly createScheduleUseCase: CreateSchedule, private readonly updateScheduleUseCase: UpdateSchedule, private readonly getScheduleUseCase: GetSchedule, private readonly listSchedulesUseCase: ListSchedules, private readonly deleteScheduleUseCase: DeleteSchedule, private readonly schedulerService: SchedulerService) { }
    async createSchedule(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const schedule = await this.createScheduleUseCase.execute({
            projectId,
            ...req.body,
        });
        res.status(201).json(createSuccessResponse(schedule));
    }
    async updateSchedule(req: Request, res: Response): Promise<void> {
        const { projectId, scheduleId } = req.params;
        const schedule = await this.updateScheduleUseCase.execute({
            id: scheduleId,
            projectId,
            ...req.body,
        });
        res.status(200).json(createSuccessResponse(schedule));
    }
    async getSchedule(req: Request, res: Response): Promise<void> {
        const { scheduleId } = req.params;
        const schedule = await this.getScheduleUseCase.execute(scheduleId);
        res.status(200).json(createSuccessResponse(schedule));
    }
    async listSchedules(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const schedules = await this.listSchedulesUseCase.execute(projectId);
        res.status(200).json(createSuccessResponse(schedules));
    }
    async deleteSchedule(req: Request, res: Response): Promise<void> {
        const { scheduleId } = req.params;
        await this.deleteScheduleUseCase.execute(scheduleId);
        res.status(204).send();
    }
    async runNow(req: Request, res: Response): Promise<void> {
        const { scheduleId } = req.params;
        const schedule = await this.schedulerService.runNow(scheduleId);
        res.status(200).json(createSuccessResponse(schedule));
    }
    async enableSchedule(req: Request, res: Response): Promise<void> {
        const { projectId, scheduleId } = req.params;
        const schedule = await this.updateScheduleUseCase.execute({
            id: scheduleId,
            projectId,
            enabled: true,
        });
        res.status(200).json(createSuccessResponse(schedule));
    }
    async disableSchedule(req: Request, res: Response): Promise<void> {
        const { projectId, scheduleId } = req.params;
        const schedule = await this.updateScheduleUseCase.execute({
            id: scheduleId,
            projectId,
            enabled: false,
        });
        res.status(200).json(createSuccessResponse(schedule));
    }
}
export default ScheduleController;

