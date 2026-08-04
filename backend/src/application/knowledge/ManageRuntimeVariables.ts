// ManageRuntimeVariables - Application Use Case for Runtime Variables in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { RuntimeVariable } from '../../domain/knowledge/RuntimeVariableEntity';
import { RuntimeVariableRepository } from '../../domain/knowledge/RuntimeVariableRepository';

export class ManageRuntimeVariables {
  constructor(private readonly runtimeVariableRepository: RuntimeVariableRepository) {}

  async create(input: Omit<RuntimeVariable, 'id' | 'createdAt' | 'updatedAt'>): Promise<RuntimeVariable> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Runtime Variable name is required');
    }

    const exists = await this.runtimeVariableRepository.existsByName(input.name.trim(), input.projectId);
    if (exists) {
      throw new Error(`Runtime Variable with name "${input.name}" already exists in this project`);
    }

    const now = Date.now();
    const variable: RuntimeVariable = {
      ...input,
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() || '',
      tags: input.tags?.map(t => t.trim()).filter(t => t.length > 0) || [],
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

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Runtime Variable name cannot be empty');
    }

    return this.runtimeVariableRepository.update(id, {
      ...data,
      name: data.name?.trim() || existing.name,
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