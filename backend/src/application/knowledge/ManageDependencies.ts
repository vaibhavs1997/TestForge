// ManageDependencies - Application Use Case for Dependencies in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { Dependency } from '../../domain/knowledge/DependencyEntity';
import { DependencyRepository } from '../../domain/knowledge/DependencyRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class ManageDependencies {
  constructor(private readonly dependencyRepository: DependencyRepository) {}

  async create(input: Omit<Dependency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dependency> {
    const name = ValidationHelpers.validateRequired(input.name, 'Dependency name');

    try {
      await ValidationHelpers.validateUniqueName(
        this.dependencyRepository,
        input.name,
        input.projectId
      );
    } catch (error) {
      if (error instanceof Error && error.message === `Resource with name "${input.name}" already exists in this project`) {
        throw new Error(`Dependency with name "${input.name}" already exists in this project`);
      }
      throw error;
    }

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
    const existing = await this.dependencyRepository.findById(id);
    if (!existing) {
      throw new Error(`Dependency with id ${id} not found`);
    }

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
    const existing = await this.dependencyRepository.findById(id);
    if (!existing) {
      throw new Error(`Dependency with id ${id} not found`);
    }
    await this.dependencyRepository.delete(id);
  }

  async get(id: string): Promise<Dependency> {
    const dependency = await this.dependencyRepository.findById(id);
    if (!dependency) {
      throw new Error(`Dependency with id ${id} not found`);
    }
    return dependency;
  }

  async list(projectId: string): Promise<Dependency[]> {
    return this.dependencyRepository.findByProject(projectId);
  }
}

export default ManageDependencies;
