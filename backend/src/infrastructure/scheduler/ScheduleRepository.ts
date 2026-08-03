// ScheduleRepository - File-based repository implementation for the Scheduler Module
// Persists schedules to data/schedules/{projectId}/schedules.json
import * as fs from 'fs';
import * as path from 'path';
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity';
import type { ScheduleRepository as ScheduleRepositoryInterface } from '../../domain/scheduler/ScheduleRepository';

const DATA_ROOT = path.join(process.cwd(), 'data', 'schedules');

export class ScheduleRepository implements ScheduleRepositoryInterface {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getSchedulesFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'schedules.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(schedule: ScheduleEntity): Promise<ScheduleEntity> {
    this.ensureProjectDir(schedule.projectId);
    const filePath = this.getSchedulesFilePath(schedule.projectId);
    const items = await this.readSchedules(schedule.projectId);
    items.push(schedule);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return schedule;
  }

  async update(id: string, data: Partial<ScheduleEntity>): Promise<ScheduleEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readSchedules(projectId);
      const index = items.findIndex(s => s.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getSchedulesFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Schedule with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readSchedules(projectId);
      const filtered = items.filter(s => s.id !== id);
      if (filtered.length !== items.length) {
        const filePath = this.getSchedulesFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<ScheduleEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readSchedules(projectId);
      const schedule = items.find(s => s.id === id);
      if (schedule) return schedule;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ScheduleEntity[]> {
    return this.readSchedules(projectId);
  }

  async list(): Promise<ScheduleEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: ScheduleEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readSchedules(projectId);
      allItems.push(...items);
    }
    return allItems;
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const items = await this.readSchedules(projectId);
    return items.some(s => s.name.toLowerCase() === name.toLowerCase());
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readSchedules(projectId: string): ScheduleEntity[] {
    const filePath = this.getSchedulesFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default ScheduleRepository;