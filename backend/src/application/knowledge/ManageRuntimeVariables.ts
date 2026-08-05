// ManageRuntimeVariables - Application Use Case for Runtime Variables in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { RuntimeVariable } from '../../domain/knowledge/RuntimeVariableEntity';
import { RuntimeVariableRepository } from '../../domain/knowledge/RuntimeVariableRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class ManageRuntimeVariables {
  constructor(private readonly runtimeVariableRepository: RuntimeVariableRepository) {}

  async create(input: Omit<RuntimeVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<RuntimeVariable> {
    const name = ValidationHelpers.validateRequired(input.name, 'Runtime Variable name');

    try {
      await ValidationHelpers.validateUniqueName(
        this.runtimeVariableRepository,
        input.name,
        input.projectId
      );
    } catch (error) {
      if (error instanceof Error && error.message === `Resource with name "${input.name}" already exists in this project`) {
        throw new Error(`Runtime Variable with name "${input.name}" already exists in this project`);
      }
      throw error;
    }

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
    const existing = await this.runtimeVariableRepository.findById(id);
    if (!existing) {
      throw new Error(`Runtime Variable with id ${id} not found`);
    }

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
    const existing = await this.runtimeVariableRepository.findById(id);
    if (!existing) {
      throw new Error(`Runtime Variable with id ${id} not found`);
    }
    await this.runtimeVariableRepository.delete(id);
  }

  async get(id: string): Promise<RuntimeVariable> {
    const variable = await this.runtimeVariableRepository.findById(id);
    if (!variable) {
      throw new Error(`Runtime Variable with id ${id} not found`);
    }
    return variable;
  }

  async list(projectId: string): Promise<RuntimeVariable[]> {
    return this.runtimeVariableRepository.findByProject(projectId);
  }
}

export default ManageRuntimeVariables;
