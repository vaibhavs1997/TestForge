// ManageDependencies - Application Use Case for Dependencies in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { deleteById, requireById, validateUniqueProjectName } from '../shared/crudHelpers';
import { Dependency } from '../../domain/knowledge/DependencyEntity';
import { DependencyRepository } from '../../domain/knowledge/DependencyRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class ManageDependencies {
  constructor(private readonly dependencyRepository: DependencyRepository) {}

  async create(input: Omit<Dependency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dependency> {
    const name = await validateUniqueProjectName(
      this.dependencyRepository,
      input.name,
      input.projectId,
      'Dependency'
    );

    const now = Date.now();
    const dependency: Dependency = {
      ...input,
      id: randomUUID(),
      name,
      description: ValidationHelpers.trimString(input.description),
      tags: ValidationHelpers.trimStringArray(input.tags),
      createdAt: now,
      updatedAt: now,
    };

    return this.dependencyRepository.create(dependency);
  }

  async update(id: string, data: Partial<Omit<Dependency, 'id' | 'createdAt'>>): Promise<Dependency> {
    const existing = await requireById(this.dependencyRepository, id, 'Dependency');

    if (data.name !== undefined) {
      ValidationHelpers.validateNotEmpty(data.name, 'Dependency name');
    }

    return this.dependencyRepository.update(id, {
      ...data,
      name: data.name !== undefined ? ValidationHelpers.trimString(data.name) : existing.name,
      description: data.description !== undefined ? ValidationHelpers.trimString(data.description) : existing.description,
      tags: data.tags !== undefined ? ValidationHelpers.trimStringArray(data.tags) : existing.tags,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await deleteById(this.dependencyRepository, id, 'Dependency');
  }

  async get(id: string): Promise<Dependency> {
    return requireById(this.dependencyRepository, id, 'Dependency');
  }

  async list(projectId: string): Promise<Dependency[]> {
    return this.dependencyRepository.findByProject(projectId);
  }
}

export default ManageDependencies;
