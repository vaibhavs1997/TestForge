// ManageBusinessRules - Application Use Case for Business Rules in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { deleteById, requireById, validateUniqueProjectName } from '../shared/crudHelpers';
import { BusinessRule } from '../../domain/knowledge/BusinessRuleEntity';
import { BusinessRuleRepository } from '../../domain/knowledge/BusinessRuleRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class ManageBusinessRules {
  constructor(private readonly businessRuleRepository: BusinessRuleRepository) {}

  async create(input: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessRule> {
    const name = await validateUniqueProjectName(
      this.businessRuleRepository,
      input.name,
      input.projectId,
      'Business Rule'
    );

    const now = Date.now();
    const rule: BusinessRule = {
      ...input,
      id: randomUUID(),
      name,
      description: ValidationHelpers.trimString(input.description),
      tags: ValidationHelpers.trimStringArray(input.tags),
      createdAt: now,
      updatedAt: now,
    };

    return this.businessRuleRepository.create(rule);
  }

  async update(id: string, data: Partial<Omit<BusinessRule, 'id' | 'createdAt'>>): Promise<BusinessRule> {
    const existing = await requireById(this.businessRuleRepository, id, 'Business Rule');

    if (data.name !== undefined) {
      ValidationHelpers.validateNotEmpty(data.name, 'Business Rule name');
    }

    return this.businessRuleRepository.update(id, {
      ...data,
      name: data.name !== undefined ? ValidationHelpers.trimString(data.name) : existing.name,
      description: data.description !== undefined ? ValidationHelpers.trimString(data.description) : existing.description,
      tags: data.tags !== undefined ? ValidationHelpers.trimStringArray(data.tags) : existing.tags,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await deleteById(this.businessRuleRepository, id, 'Business Rule');
  }

  async get(id: string): Promise<BusinessRule> {
    return requireById(this.businessRuleRepository, id, 'Business Rule');
  }

  async list(projectId: string): Promise<BusinessRule[]> {
    return this.businessRuleRepository.findByProject(projectId);
  }
}

export default ManageBusinessRules;
