import type { ProjectRepository } from '../../domain/project/ProjectRepository';
import type { ProjectRecord } from '../../domain/project/ProjectRecord';
export class ListProjects {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(): Promise<ProjectRecord[]> {
    return this.projectRepository.list();
  }
}

export class GetProject {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(id: string): Promise<ProjectRecord> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    return project;
  }
}

export class CreateProject {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(input: {
    name: string;
    projectKey?: string;
    description?: string;
    id?: string;
    status?: ProjectRecord['status'];
  }): Promise<ProjectRecord> {
    return this.projectRepository.create(input);
  }
}

export class UpdateProject {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(
    id: string,
    patch: { name?: string; projectKey?: string; description?: string; status?: ProjectRecord['status'] },
  ): Promise<ProjectRecord> {
    return this.projectRepository.update(id, patch);
  }
}

export class DeleteProject {
  constructor(private readonly projectRepository: ProjectRepository) {}

  async execute(id: string): Promise<void> {
    await this.projectRepository.delete(id);
  }
}
