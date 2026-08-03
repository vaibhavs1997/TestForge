// ManageDocumentation - Application Use Case for Documentation in Knowledge Hub
import { Documentation } from '../../domain/knowledge/DocumentationEntity';
import { DocumentationRepository } from '../../domain/knowledge/DocumentationRepository';

export class ManageDocumentation {
  constructor(private readonly documentationRepository: DocumentationRepository) {}

  async create(input: Omit<Documentation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Documentation> {
    if (!input.title || !input.title.trim()) {
      throw new Error('Documentation title is required');
    }

    const now = Date.now();
    const doc: Documentation = {
      ...input,
      id: crypto.randomUUID(),
      title: input.title.trim(),
      content: input.content?.trim() || '',
      tags: input.tags?.map(t => t.trim()).filter(t => t.length > 0) || [],
      createdAt: now,
      updatedAt: now,
    };

    return this.documentationRepository.create(doc);
  }

  async update(id: string, data: Partial<Omit<Documentation, 'id' | 'createdAt'>>): Promise<Documentation> {
    const existing = await this.documentationRepository.findById(id);
    if (!existing) {
      throw new Error(`Documentation with id ${id} not found`);
    }

    if (data.title !== undefined && !data.title.trim()) {
      throw new Error('Documentation title cannot be empty');
    }

    return this.documentationRepository.update(id, {
      ...data,
      title: data.title?.trim() || existing.title,
      content: data.content?.trim() || existing.content,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.documentationRepository.findById(id);
    if (!existing) {
      throw new Error(`Documentation with id ${id} not found`);
    }
    await this.documentationRepository.delete(id);
  }

  async get(id: string): Promise<Documentation> {
    const doc = await this.documentationRepository.findById(id);
    if (!doc) {
      throw new Error(`Documentation with id ${id} not found`);
    }
    return doc;
  }

  async list(projectId: string): Promise<Documentation[]> {
    return this.documentationRepository.findByProject(projectId);
  }
}

export default ManageDocumentation;