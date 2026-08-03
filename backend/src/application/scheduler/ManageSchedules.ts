// ManageSchedules - Application Use Cases for schedule retrieval and deletion
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository';

export class GetSchedule {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async execute(id: string): Promise<ScheduleEntity> {
    const schedule = await this.scheduleRepository.findById(id);
    if (!schedule) {
      throw new Error(`Schedule with id ${id} not found`);
    }
    return schedule;
  }
}

export class ListSchedules {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async execute(projectId: string): Promise<ScheduleEntity[]> {
    return this.scheduleRepository.findByProject(projectId);
  }
}

export class DeleteSchedule {
  constructor(private readonly scheduleRepository: ScheduleRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.scheduleRepository.findById(id);
    if (!existing) {
      throw new Error(`Schedule with id ${id} not found`);
    }
    await this.scheduleRepository.delete(id);
  }
}

export default { GetSchedule, ListSchedules, DeleteSchedule };