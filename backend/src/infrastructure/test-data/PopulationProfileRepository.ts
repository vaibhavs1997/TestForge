// PopulationProfileRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { PopulationProfileEntity } from '../../domain/test-data/PopulationProfileEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'test-data');
}

export class PopulationProfileRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getProfilesFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'profiles.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(profile: PopulationProfileEntity): Promise<PopulationProfileEntity> {
    const projectId = profile.datasetId.split('-')[0] || '1';
    this.ensureProjectDir(projectId);
    const filePath = this.getProfilesFilePath(projectId);
    const profiles = await this.readProfiles(projectId);
    profiles.push(profile);
    await writeJsonArray(filePath, profiles);
    return profile;
  }

  async update(id: string, data: Partial<PopulationProfileEntity>): Promise<PopulationProfileEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const profiles = await this.readProfiles(projectId);
      const index = profiles.findIndex(p => p.id === id);
      if (index !== -1) {
        const updated = { ...profiles[index], ...data, updatedAt: Date.now() };
        profiles[index] = updated;
        const filePath = this.getProfilesFilePath(projectId);
        await writeJsonArray(filePath, profiles);
        return updated;
      }
    }
    throw new Error(`Profile with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const profiles = await this.readProfiles(projectId);
      const filtered = profiles.filter(p => p.id !== id);
      if (filtered.length !== profiles.length) {
        const filePath = this.getProfilesFilePath(projectId);
        await writeJsonArray(filePath, filtered);
        return;
      }
    }
  }

  async findById(id: string): Promise<PopulationProfileEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const profiles = await this.readProfiles(projectId);
      const profile = profiles.find(p => p.id === id);
      if (profile) return profile;
    }
    return null;
  }

  async findByDataset(datasetId: string): Promise<PopulationProfileEntity[]> {
    const projectId = datasetId.split('-')[0] || '1';
    const profiles = await this.readProfiles(projectId);
    return profiles.filter(p => p.datasetId === datasetId);
  }

  async findByColumn(columnId: string): Promise<PopulationProfileEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const profiles = await this.readProfiles(projectId);
      const profile = profiles.find(p => p.columnId === columnId);
      if (profile) return profile;
    }
    return null;
  }

  async list(): Promise<PopulationProfileEntity[]> {
    const projectIds = this.listProjectIds();
    const allProfiles: PopulationProfileEntity[] = [];
    for (const projectId of projectIds) {
      const profiles = await this.readProfiles(projectId);
      allProfiles.push(...profiles);
    }
    return allProfiles;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readProfiles(projectId: string): Promise<PopulationProfileEntity[]> {
    const filePath = this.getProfilesFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default PopulationProfileRepository;