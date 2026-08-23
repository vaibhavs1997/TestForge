export interface EmbeddingProviderMetadata { provider: string; model: string; dimension: number; available: boolean; }

/** Provider-neutral embedding contract. Application services never call provider HTTP APIs. */
export interface EmbeddingProvider {
  embedQuery(text: string): Promise<number[]>;
  embedDocuments(texts: string[]): Promise<number[][]>;
  metadata(): Promise<EmbeddingProviderMetadata>;
}
