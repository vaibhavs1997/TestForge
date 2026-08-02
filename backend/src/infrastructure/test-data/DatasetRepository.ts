// DatasetRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { DatasetEntity } from '../../domain/test-data/DatasetEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'test-data');

export class DatasetRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getDatasetsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'datasets.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(dataset: DatasetEntity): Promise<DatasetEntity> {
    this.ensureProjectDir(dataset.projectId);
    const filePath = this.getDatasetsFilePath(dataset.projectId);
    const datasets = await this.readDatasets(dataset.projectId);
    datasets.push(dataset);
    fs.writeFileSync(filePath, JSON.stringify(datasets, null, 2));
    return dataset;
  }

  async update(id: string, data: Partial<DatasetEntity>): Promise<DatasetEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const datasets = await this.readDatasets(projectId);
      const index = datasets.findIndex(d => d.id === id);
      if (index !== -1) {
        const updated = { ...datasets[index], ...data, updatedAt: Date.now() };
        datasets[index] = updated;
        const filePath = this.getDatasetsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(datasets, null, 2));
        return updated;
      }
    }
    throw new Error(`Dataset with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const datasets = await this.readDatasets(projectId);
      const filtered = datasets.filter(d => d.id !== id);
      if (filtered.length !== datasets.length) {
        const filePath = this.getDatasetsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<DatasetEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const datasets = await this.readDatasets(projectId);
      const dataset = datasets.find(d => d.id === id);
      if (dataset) return dataset;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<DatasetEntity[]> {
    return this.readDatasets(projectId);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const datasets = await this.readDatasets(projectId);
    return datasets.some(d => d.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<DatasetEntity[]> {
    const projectIds = this.listProjectIds();
    const allDatasets: DatasetEntity[] = [];
    for (const projectId of projectIds) {
      const datasets = await this.readDatasets(projectId);
      allDatasets.push(...datasets);
    }
    return allDatasets;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readDatasets(projectId: string): DatasetEntity[] {
    const filePath = this.getDatasetsFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default DatasetRepository;