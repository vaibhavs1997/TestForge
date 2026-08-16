// ManageDocumentation - Application Use Case for Documentation in Knowledge Hub
import { randomUUID } from 'node:crypto';
import { deleteById, requireById } from '../shared/crudHelpers';
import { Documentation } from '../../domain/knowledge/DocumentationEntity';
import { DocumentationRepository } from '../../domain/knowledge/DocumentationRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class ManageDocumentation {
  constructor(private readonly documentationRepository: DocumentationRepository) {}

  async create(input: Omit<Documentation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Documentation> {
    const title = ValidationHelpers.validateRequired(input.title, 'Documentation title');

    const now = Date.now();
    const doc: Documentation = {
      ...input,
      id: randomUUID(),
      title,
      content: ValidationHelpers.trimString(input.content),
      tags: ValidationHelpers.trimStringArray(input.tags),
      createdAt: now,
      updatedAt: now,
    };

    return this.documentationRepository.create(doc);
  }

  async update(id: string, data: Partial<Omit<Documentation, 'id' | 'createdAt'>>): Promise<Documentation> {
    const existing = await requireById(this.documentationRepository, id, 'Documentation');

    if (data.title !== undefined) {
      ValidationHelpers.validateNotEmpty(data.title, 'Documentation title');
    }

    return this.documentationRepository.update(id, {
      ...data,
      title: data.title !== undefined ? ValidationHelpers.trimString(data.title) : existing.title,
      content: data.content !== undefined ? ValidationHelpers.trimString(data.content) || existing.content : existing.content,
      tags: data.tags !== undefined ? ValidationHelpers.trimStringArray(data.tags) : existing.tags,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await deleteById(this.documentationRepository, id, 'Documentation');
  }

  async get(id: string): Promise<Documentation> {
    return requireById(this.documentationRepository, id, 'Documentation');
  }

  async list(projectId: string): Promise<Documentation[]> {
    return this.documentationRepository.findByProject(projectId);
  }
}

export default ManageDocumentation;
