// PipelineRepository - Domain Repository Interface
import { PipelineEntity, PipelineStage, PipelineStatus, StageResult } from './PipelineEntity.js';

export interface PipelineRepository {
  create(pipeline: PipelineEntity): Promise<PipelineEntity>;
  findById(id: string): Promise<PipelineEntity | null>;
  findByProject(projectId: string): Promise<PipelineEntity[]>;
  update(id: string, data: Partial<PipelineEntity>): Promise<PipelineEntity | null>;
  updateStage(id: string, stageResult: StageResult): Promise<PipelineEntity | null>;
  delete(id: string): Promise<boolean>;
}

export default PipelineRepository;