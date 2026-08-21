// ManageRuntimeVariables - Application Use Case for Runtime Variables in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { deleteById, requireById, validateUniqueProjectName } from '../shared/crudHelpers.js';
import { RuntimeVariable } from '../../domain/knowledge/RuntimeVariableEntity.js';
import { RuntimeVariableRepository } from '../../domain/knowledge/RuntimeVariableRepository.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export class ManageRuntimeVariables {
  constructor(private readonly runtimeVariableRepository: RuntimeVariableRepository) {}

  async create(input: Omit<RuntimeVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<RuntimeVariable> {
    const name = await validateUniqueProjectName(
      this.runtimeVariableRepository,
      input.name,
      input.projectId,
      'Runtime Variable'
    );

    const now = Date.now();
    const variable: RuntimeVariable = {
      ...input,
      id: randomUUID(),
      name,
      description: ValidationHelpers.trimString(input.description),
      tags: ValidationHelpers.trimStringArray(input.tags),
      createdAt: now,
      updatedAt: now,
    };

    return this.runtimeVariableRepository.create(variable);
  }

  async update(id: string, data: Partial<Omit<RuntimeVariable, 'id' | 'createdAt'>>): Promise<RuntimeVariable> {
    const existing = await requireById(this.runtimeVariableRepository, id, 'Runtime Variable');

    if (data.name !== undefined) {
      ValidationHelpers.validateNotEmpty(data.name, 'Runtime Variable name');
    }

    return this.runtimeVariableRepository.update(id, {
      ...data,
      name: data.name !== undefined ? ValidationHelpers.trimString(data.name) : existing.name,
      description: data.description !== undefined ? ValidationHelpers.trimString(data.description) : existing.description,
      tags: data.tags !== undefined ? ValidationHelpers.trimStringArray(data.tags) : existing.tags,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await deleteById(this.runtimeVariableRepository, id, 'Runtime Variable');
  }

  async get(id: string): Promise<RuntimeVariable> {
    return requireById(this.runtimeVariableRepository, id, 'Runtime Variable');
  }

  async list(projectId: string): Promise<RuntimeVariable[]> {
    return this.runtimeVariableRepository.findByProject(projectId);
  }
}

export default ManageRuntimeVariables;
