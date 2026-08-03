// ManageDependencies - Application Use Case for Dependencies in Knowledge Hub
import { Dependency } from '../../domain/knowledge/DependencyEntity';
import { DependencyRepository } from '../../domain/knowledge/DependencyRepository';

export class ManageDependencies {
  constructor(private readonly dependencyRepository: DependencyRepository) {}

  async create(input: Omit<Dependency, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dependency> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Dependency name is required');
    }

    const exists = await this.dependencyRepository.existsByName(input.name.trim(), input.projectId);
    if (exists) {
      throw new Error(`Dependency with name "${input.name}" already exists in this project`);
    }

    const now = Date.now();
    const dependency: Dependency = {
      ...input,
      id: crypto.randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() || '',
      tags: input.tags?.map(t => t.trim()).filter(t => t.length > 0) || [],
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

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Dependency name cannot be empty');
    }

    return this.dependencyRepository.update(id, {
      ...data,
      name: data.name?.trim() || existing.name,
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