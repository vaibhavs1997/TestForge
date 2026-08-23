import type { EmbeddingProvider, KnowledgeSearchFilters, KnowledgeSearchResult, VectorStore } from '../../domain/rag/index.js';
import { defaultEvidenceGovernance } from '../../infrastructure/security/EvidenceGovernanceService.js';

export class RetrieveProjectKnowledge {
  constructor(private readonly embeddings: EmbeddingProvider | undefined, private readonly vectorStore: VectorStore | undefined) {}
  async execute(input: { projectId: string; query: string; limit?: number; minimumSimilarity?: number; filters?: KnowledgeSearchFilters }): Promise<KnowledgeSearchResult[]> {
    if (!this.embeddings || !this.vectorStore) throw new Error('RAG knowledge retrieval is disabled.');
    if (!input.query?.trim()) throw new Error('Knowledge search query must not be empty.');
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
    if (input.minimumSimilarity !== undefined && (input.minimumSimilarity < 0 || input.minimumSimilarity > 1)) throw new Error('Minimum similarity must be between 0 and 1.');
    const metadata = await this.embeddings.metadata();
    const embedding = await this.embeddings.embedQuery(input.query);
    if (embedding.length !== metadata.dimension) throw new Error('Embedding provider returned an incompatible query dimension.');
    const results = await this.vectorStore.search({ projectId: input.projectId, embedding, provider: metadata.provider, model: metadata.model, dimension: metadata.dimension, limit, queryText: input.query, minimumSimilarity: input.minimumSimilarity, filters: input.filters });
    return results.map((result) => ({ ...result, content: defaultEvidenceGovernance.protect(result.content, 'report') as string }));
  }
}
