import { createHash, randomUUID } from 'node:crypto';
import type { EmbeddingProvider, EmbeddedKnowledgeSource, VectorStore } from '../../domain/rag/index.js';
import { sensitiveDataRedactor } from '../../infrastructure/security/SensitiveDataRedactionService.js';

export interface IndexKnowledgeSourceInput extends Omit<EmbeddedKnowledgeSource, 'checksum' | 'embeddingProvider' | 'embeddingModel' | 'embeddingDimension'> { content: string; chunkSize?: number; chunkOverlap?: number; }

/** Simple deterministic indexing flow; retrieval and generation intentionally remain out of scope. */
export class IndexKnowledgeSource {
  constructor(private readonly embeddings: EmbeddingProvider, private readonly vectorStore: VectorStore, private readonly batchSize = 32) {}
  async execute(input: IndexKnowledgeSourceInput): Promise<{ indexed: boolean; chunks: number; dimension: number }> {
    if (!input.content.trim()) throw new Error('Knowledge source content must not be empty.');
    const safeContent = sensitiveDataRedactor.redact(input.content);
    const checksum = createHash('sha256').update(safeContent).digest('hex');
    const metadata = await this.embeddings.metadata();
    const source = { ...input, checksum, embeddingProvider: metadata.provider, embeddingModel: metadata.model, embeddingDimension: metadata.dimension };
    const changed = await this.vectorStore.upsertSource(source);
    if (!changed) return { indexed: false, chunks: 0, dimension: metadata.dimension };
    const chunks = splitText(safeContent, input.chunkSize ?? 1000, input.chunkOverlap ?? 120);
    const vectors: number[][] = [];
    for (let offset = 0; offset < chunks.length; offset += this.batchSize) vectors.push(...await this.embeddings.embedDocuments(chunks.slice(offset, offset + this.batchSize)));
    await this.vectorStore.replaceSourceChunks(input.projectId, input.id, chunks.map((content, chunkIndex) => ({
      id: randomUUID(), sourceId: input.id, projectId: input.projectId, chunkIndex, content,
      metadata: { ...(input.metadata ?? {}), sourceType: input.sourceType, sourceVersion: input.version, title: input.title }, embedding: vectors[chunkIndex], embeddingProvider: metadata.provider, embeddingModel: metadata.model, embeddingDimension: metadata.dimension, sourceType: input.sourceType, sourceVersion: input.version,
    })));
    return { indexed: true, chunks: chunks.length, dimension: metadata.dimension };
  }
}

export function splitText(text: string, size: number, overlap: number): string[] {
  if (!Number.isInteger(size) || size < 1 || overlap < 0 || overlap >= size) throw new Error('Invalid knowledge chunking configuration.');
  // Preserve headings, paragraphs, AC/business-rule lines and operation documentation where they fit.
  const units = text.trim().split(/\n\s*\n|(?=^#{1,6}\s)|(?=^(?:AC|Rule|Operation)\s*[:#])/gim).map((unit) => unit.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const logical = units.filter((unit) => unit.length <= size);
  if (logical.length && logical.join('').length >= text.trim().length * 0.7) return logical;
  const normalized = text.replace(/\s+/g, ' ').trim(); const chunks: string[] = [];
  for (let start = 0; start < normalized.length; start += size - overlap) chunks.push(normalized.slice(start, start + size));
  return chunks;
}
