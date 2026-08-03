// KnowledgeFlowRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeFlowEntity } from '../../domain/knowledge/KnowledgeFlowEntity';
import { VersionService } from '../../application/versioning/VersionService';

const DATA_ROOT = path.join(process.cwd(), 'data', 'knowledge');

export class KnowledgeFlowRepository {
  constructor(private readonly versionService?: VersionService) {}
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getFlowsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'flows.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(flow: KnowledgeFlowEntity): Promise<KnowledgeFlowEntity> {
    this.ensureProjectDir(flow.projectId);
    const filePath = this.getFlowsFilePath(flow.projectId);
    const flows = await this.readFlows(flow.projectId);
    flows.push(flow);
    fs.writeFileSync(filePath, JSON.stringify(flows, null, 2));
    return flow;
  }

  async update(id: string, data: Partial<KnowledgeFlowEntity>): Promise<KnowledgeFlowEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const flows = await this.readFlows(projectId);
      const index = flows.findIndex(f => f.id === id);
      if (index !== -1) {
        const updated = { ...flows[index], ...data, updatedAt: Date.now() };
        flows[index] = updated;
        const filePath = this.getFlowsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(flows, null, 2));
        return updated;
      }
    }
    throw new Error(`Flow with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const flows = await this.readFlows(projectId);
      const filtered = flows.filter(f => f.id !== id);
      if (filtered.length !== flows.length) {
        const filePath = this.getFlowsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<KnowledgeFlowEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const flows = await this.readFlows(projectId);
      const flow = flows.find(f => f.id === id);
      if (flow) return flow;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<KnowledgeFlowEntity[]> {
    return this.readFlows(projectId);
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const flows = await this.readFlows(projectId);
    return flows.some(f => f.name.toLowerCase() === name.toLowerCase());
  }

  async list(): Promise<KnowledgeFlowEntity[]> {
    const projectIds = this.listProjectIds();
    const allFlows: KnowledgeFlowEntity[] = [];
    for (const projectId of projectIds) {
      const flows = await this.readFlows(projectId);
      allFlows.push(...flows);
    }
    return allFlows;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readFlows(projectId: string): KnowledgeFlowEntity[] {
    const filePath = this.getFlowsFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default KnowledgeFlowRepository;