import type { ProjectRecord } from '../../domain/project/ProjectRecord';

export interface ProjectRepository {
  list(): Promise<ProjectRecord[]>;
  findById(id: string): Promise<ProjectRecord | null>;
  create(input: {
    name: string;
    projectKey?: string;
    description?: string;
    id?: string;
    status?: ProjectRecord['status'];
  }): Promise<ProjectRecord>;
  update(
    id: string,
    patch: {
      name?: string;
      projectKey?: string;
      description?: string;
      status?: ProjectRecord['status'];
    },
  ): Promise<ProjectRecord>;
  delete(id: string): Promise<void>;
  syncDiscoveredProjects(): Promise<ProjectRecord[]>;
}

export default ProjectRepository;
