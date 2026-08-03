// PipelineRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { PipelineRepository } from '../../domain/pipeline/PipelineRepository';
import { PipelineEntity, PipelineStage, PipelineStatus, StageResult } from '../../domain/pipeline/PipelineEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'pipelines');

export class PipelineRepositoryImpl implements PipelineRepository {
  private getPipelineFilePath(id: string): string {
    return path.join(DATA_ROOT, `${id}.json`);
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_ROOT)) {
      fs.mkdirSync(DATA_ROOT, { recursive: true });
    }
  }

  async create(pipeline: PipelineEntity): Promise<PipelineEntity> {
    this.ensureDataDir();
    const filePath = this.getPipelineFilePath(pipeline.id);
    fs.writeFileSync(filePath, JSON.stringify(pipeline, null, 2));
    return pipeline;
  }

  async findById(id: string): Promise<PipelineEntity | null> {
    const filePath = this.getPipelineFilePath(id);
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as PipelineEntity;
  }

  async findByProject(projectId: string): Promise<PipelineEntity[]> {
    if (!fs.existsSync(DATA_ROOT)) return [];
    const files = fs.readdirSync(DATA_ROOT).filter(f => f.endsWith('.json'));
    const pipelines: PipelineEntity[] = [];
    for (const file of files) {
      const filePath = path.join(DATA_ROOT, file);
      const data = fs.readFileSync(filePath, 'utf-8');
      const pipeline = JSON.parse(data) as PipelineEntity;
      if (pipeline.projectId === projectId) {
        pipelines.push(pipeline);
      }
    }
    return pipelines;
  }

  async update(id: string, data: Partial<PipelineEntity>): Promise<PipelineEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    
    const updated = { ...existing, ...data };
    const filePath = this.getPipelineFilePath(id);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async updateStage(id: string, stageResult: StageResult): Promise<PipelineEntity | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const stages = existing.stages.map(s => {
      if (s.stage === stageResult.stage) {
        return stageResult;
      }
      return s;
    });

    const updated = {
      ...existing,
      currentStage: stageResult.stage,
      status: stageResult.status === 'failed' ? 'failed' : existing.status,
      stages,
      completedAt: stageResult.status === 'completed' && stageResult.stage === existing.stages[existing.stages.length - 1]?.stage 
        ? Date.now() 
        : existing.completedAt,
      error: stageResult.error || existing.error
    };

    const filePath = this.getPipelineFilePath(id);
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const filePath = this.getPipelineFilePath(id);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }
}

export default PipelineRepositoryImpl;