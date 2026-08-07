// ManageBusinessRules - Application Use Case for Business Rules in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { BusinessRule } from '../../domain/knowledge/BusinessRuleEntity';
import { BusinessRuleRepository } from '../../domain/knowledge/BusinessRuleRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class ManageBusinessRules {
  constructor(private readonly businessRuleRepository: BusinessRuleRepository) {}

  async create(input: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessRule> {
    const name = ValidationHelpers.validateRequired(input.name, 'Business Rule name');

    try {
      await ValidationHelpers.validateUniqueName(
        this.businessRuleRepository,
        input.name,
        input.projectId
      );
    } catch (error) {
      if (error instanceof Error && error.message === `Resource with name "${input.name}" already exists in this project`) {
        throw new Error(`Business Rule with name "${input.name}" already exists in this project`);
      }
      throw error;
    }

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
    const existing = await this.businessRuleRepository.findById(id);
    if (!existing) {
      throw new Error(`Business Rule with id ${id} not found`);
    }

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
    const existing = await this.businessRuleRepository.findById(id);
    if (!existing) {
      throw new Error(`Business Rule with id ${id} not found`);
    }
    await this.businessRuleRepository.delete(id);
  }

  async get(id: string): Promise<BusinessRule> {
    const rule = await this.businessRuleRepository.findById(id);
    if (!rule) {
      throw new Error(`Business Rule with id ${id} not found`);
    }
    return rule;
  }

  async list(projectId: string): Promise<BusinessRule[]> {
    return this.businessRuleRepository.findByProject(projectId);
  }
}

export default ManageBusinessRules;
