// PipelineRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { PipelineRepository } from '../../domain/pipeline/PipelineRepository.js';
import { PipelineEntity, PipelineStage, PipelineStatus, StageResult } from '../../domain/pipeline/PipelineEntity.js';
import { readJsonFile, writeJsonFile } from '../persistence/JsonFileStore.js';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'pipelines');
}

export class PipelineRepositoryImpl implements PipelineRepository {
  private getPipelineFilePath(id: string): string {
    return path.join(getDataRoot(), `${id}.json`);
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(getDataRoot())) {
      fs.mkdirSync(getDataRoot(), { recursive: true });
    }
  }

  async create(pipeline: PipelineEntity): Promise<PipelineEntity> {
    this.ensureDataDir();
    const filePath = this.getPipelineFilePath(pipeline.id);
    await writeJsonFile(filePath, pipeline);
    return pipeline;
  }

  async findById(id: string): Promise<PipelineEntity | null> {
    const filePath = this.getPipelineFilePath(id);
    return readJsonFile<PipelineEntity | null>(filePath, null);
  }

  async findByProject(projectId: string): Promise<PipelineEntity[]> {
    if (!fs.existsSync(getDataRoot())) return [];
    const files = fs.readdirSync(getDataRoot()).filter(f => f.endsWith('.json'));
    const pipelines: PipelineEntity[] = [];
    for (const file of files) {
      const filePath = path.join(getDataRoot(), file);
      const pipeline = await readJsonFile<PipelineEntity | null>(filePath, null);
      if (pipeline && pipeline.projectId === projectId) {
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
    await writeJsonFile(filePath, updated);
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
    await writeJsonFile(filePath, updated);
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