export interface EmbeddedChunk {
  id: string;
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimension: number;
  sourceType?: string;
  sourceVersion?: string;
}

export interface VectorStore {
  upsertSource(source: EmbeddedKnowledgeSource): Promise<boolean>;
  replaceSourceChunks(projectId: string, sourceId: string, chunks: EmbeddedChunk[]): Promise<void>;
  deleteBySource(projectId: string, sourceId: string): Promise<void>;
  listBySource(projectId: string, sourceId: string): Promise<EmbeddedChunk[]>;
  search(input: VectorSearchInput): Promise<KnowledgeSearchResult[]>;
}

export interface RetrievalRankingConfig { operationRefBoost?: number; requirementRefBoost?: number; sourceTypeBoost?: number; tagBoost?: number; fullTextWeight?: number; }
export interface VectorSearchInput { projectId: string; embedding: number[]; provider: string; model: string; dimension: number; limit: number; queryText?: string; minimumSimilarity?: number; filters?: KnowledgeSearchFilters; ranking?: RetrievalRankingConfig; }
export interface KnowledgeSearchFilters { sourceType?: string; sourceId?: string; operationRef?: string; requirementRef?: string; tag?: string; }
export interface KnowledgeCitation { sourceId: string; sourceType: string; title?: string; version?: string; chunkIndex: number; section?: string; page?: number; operationRefs?: string[]; requirementRefs?: string[]; }
export interface KnowledgeSearchResult { chunkId: string; content: string; score: number; citation: KnowledgeCitation; metadata: Record<string, unknown>; }
export type KnowledgeIndexStatus = 'CURRENT' | 'REINDEX_REQUIRED' | 'INDEXING' | 'FAILED';

export interface EmbeddedKnowledgeSource {
  id: string;
  projectId: string;
  sourceType: string;
  sourceExternalId?: string;
  title?: string;
  version?: string;
  checksum: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimension: number;
  metadata?: Record<string, unknown>;
}
