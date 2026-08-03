// ManageAssertions - Application service for Assertion Library

import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import { AssertionEntity, AssertionCategory, AssertionSeverity, AssertionType } from '../../domain/assertion/AssertionEntity';

export interface AssertionFormData {
  projectId: string;
  name: string;
  description: string;
  category: AssertionCategory;
  enabled: boolean;
  type: AssertionType;
  expression: string;
  expectedValue: any;
  severity: AssertionSeverity;
  tags: string[];
}

export class ManageAssertions {
  constructor(private readonly assertionRepository: AssertionRepository) {}

  async createAssertion(data: AssertionFormData): Promise<AssertionEntity> {
    // Validate unique name
    const exists = await this.assertionRepository.existsByName(data.name, data.projectId);
    if (exists) {
      throw new Error(`Assertion with name "${data.name}" already exists`);
    }

    const assertion: Omit<AssertionEntity, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data,
    };

    return this.assertionRepository.create(assertion);
  }

  async updateAssertion(id: string, data: Partial<AssertionFormData>): Promise<AssertionEntity> {
    const existing = await this.assertionRepository.findById(id);
    if (!existing) {
      throw new Error(`Assertion with id ${id} not found`);
    }

    // If name is being updated, check uniqueness
    if (data.name && data.name !== existing.name) {
      const exists = await this.assertionRepository.existsByName(data.name, existing.projectId);
      if (exists) {
        throw new Error(`Assertion with name "${data.name}" already exists`);
      }
    }

    const updateData: Partial<Omit<AssertionEntity, 'id' | 'projectId' | 'createdAt'>> = {
      ...data,
    };

    return this.assertionRepository.update(id, updateData);
  }

  async deleteAssertion(id: string): Promise<void> {
    const existing = await this.assertionRepository.findById(id);
    if (!existing) {
      throw new Error(`Assertion with id ${id} not found`);
    }

    await this.assertionRepository.delete(id);
  }

  async getAssertion(id: string): Promise<AssertionEntity | null> {
    return this.assertionRepository.findById(id);
  }

  async listAssertions(projectId: string): Promise<AssertionEntity[]> {
    return this.assertionRepository.findByProject(projectId);
  }

  async getAssertionsByCategory(projectId: string, category: string): Promise<AssertionEntity[]> {
    return this.assertionRepository.findByCategory(projectId, category);
  }

  async getAssertionsByTag(projectId: string, tag: string): Promise<AssertionEntity[]> {
    return this.assertionRepository.findByTag(projectId, tag);
  }

  async toggleAssertion(id: string, enabled: boolean): Promise<AssertionEntity> {
    return this.assertionRepository.update(id, { enabled });
  }

  async duplicateAssertion(id: string): Promise<AssertionEntity> {
    const existing = await this.assertionRepository.findById(id);
    if (!existing) {
      throw new Error(`Assertion with id ${id} not found`);
    }

    const duplicate: Omit<AssertionEntity, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId: existing.projectId,
      name: `${existing.name} (Copy)`,
      description: existing.description,
      category: existing.category,
      enabled: existing.enabled,
      type: existing.type,
      expression: existing.expression,
      expectedValue: existing.expectedValue,
      severity: existing.severity,
      tags: [...existing.tags],
    };

    return this.assertionRepository.create(duplicate);
  }

  async searchAssertions(projectId: string, query: string): Promise<AssertionEntity[]> {
    const allAssertions = await this.assertionRepository.findByProject(projectId);
    const lowerQuery = query.toLowerCase();
    
    return allAssertions.filter(assertion => 
      assertion.name.toLowerCase().includes(lowerQuery) ||
      assertion.description.toLowerCase().includes(lowerQuery) ||
      assertion.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

export default ManageAssertions;