// ScheduleRepository - Domain Repository Interface for the Scheduler Module
import { ScheduleEntity } from './ScheduleEntity.js';

export interface ScheduleRepository {
  create(schedule: ScheduleEntity): Promise<ScheduleEntity>;
  update(id: string, data: Partial<ScheduleEntity>): Promise<ScheduleEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<ScheduleEntity | null>;
  findByProject(projectId: string): Promise<ScheduleEntity[]>;
  list(): Promise<ScheduleEntity[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
}

export default ScheduleRepository;