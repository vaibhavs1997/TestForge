// ManageBusinessRules - Application Use Case for Business Rules in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { BusinessRule } from '../../domain/knowledge/BusinessRuleEntity';
import { BusinessRuleRepository } from '../../domain/knowledge/BusinessRuleRepository';

export class ManageBusinessRules {
  constructor(private readonly businessRuleRepository: BusinessRuleRepository) {}

  async create(input: Omit<BusinessRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessRule> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Business Rule name is required');
    }

    const exists = await this.businessRuleRepository.existsByName(input.name.trim(), input.projectId);
    if (exists) {
      throw new Error(`Business Rule with name "${input.name}" already exists in this project`);
    }

    const now = Date.now();
    const rule: BusinessRule = {
      ...input,
      id: randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() || '',
      tags: input.tags?.map(t => t.trim()).filter(t => t.length > 0) || [],
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

    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Business Rule name cannot be empty');
    }

    return this.businessRuleRepository.update(id, {
      ...data,
      name: data.name?.trim() || existing.name,
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