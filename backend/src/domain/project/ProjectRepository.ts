import type { ProjectRecord } from '../../domain/project/ProjectRecord.js';

export interface ProjectRepository {
  list(): Promise<ProjectRecord[]>;
  findById(id: string): Promise<ProjectRecord | null>;
  create(input: {
    name: string;
    projectKey?: string;
    description?: string;
    id?: string;
    status?: ProjectRecord['status'];
    lastOpenedAt?: number;
    ownerId?: string;
    tenantId?: string;
  }): Promise<ProjectRecord>;
  update(
    id: string,
    patch: {
      name?: string;
      projectKey?: string;
      description?: string;
      status?: ProjectRecord['status'];
      lastOpenedAt?: number;
    },
  ): Promise<ProjectRecord>;
  delete(id: string): Promise<void>;
  syncDiscoveredProjects(): Promise<ProjectRecord[]>;
}

export default ProjectRepository;
