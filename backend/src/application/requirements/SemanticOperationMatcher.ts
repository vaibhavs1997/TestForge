// SemanticOperationMatcher - Uses vector embeddings for semantic similarity matching
// Provides more accurate requirement-to-operation mapping beyond keyword matching

import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity';
import { expandRequirementWithSynonyms, expandOperationWithSynonyms, getSynonymReasoning } from './OperationMappingSynonyms';

export interface SemanticMatchResult {
  operationId: string;
  operationName: string;
  operationPath: string;
  method: string;
  similarity: number;
  reasoning: string;
}

export interface SemanticMatchOptions {
  requirement: RequirementEntity;
  operations: ApiOperationEntity[];
  category?: StrategyCategory;
  threshold?: number;
}

/**
 * Computes semantic similarity between requirement text and operation metadata.
 * Uses TF-IDF-like vectorization as a lightweight alternative to full embeddings.
 */
export class SemanticOperationMatcher {
  private readonly idfCache = new Map<string, number>();

  /**
   * Calculate TF-IDF vectors for text
   */
  private computeTfIdfVector(text: string, corpusDocs: string[]): Map<string, number> {
    const tokens = this.tokenize(text);
    const tf = new Map<string, number>();
    
    // Calculate TF (term frequency)
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    
    // Normalize TF
    const maxTf = Math.max(...Array.from(tf.values()), 1);
    for (const [token, count] of tf) {
      tf.set(token, count / maxTf);
    }
    
    // Calculate TF-IDF
    const tfidf = new Map<string, number>();
    for (const [token, freq] of tf) {
      const idf = this.getIdf(token, corpusDocs);
      tfidf.set(token, freq * idf);
    }
    
    return tfidf;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (const [key, value] of vec1) {
      norm1 += value * value;
      if (vec2.has(key)) {
        dotProduct += value * vec2.get(key)!;
      }
    }
    
    for (const value of vec2.values()) {
      norm2 += value * value;
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Get or compute IDF (Inverse Document Frequency) for a token
   */
  private getIdf(token: string, documents: string[]): number {
    if (this.idfCache.has(token)) {
      return this.idfCache.get(token)!;
    }
    
    const docsWithToken = documents.filter(doc => this.tokenize(doc).includes(token)).length;
    const idf = Math.log((documents.length + 1) / (docsWithToken + 1)) + 1;
    this.idfCache.set(token, idf);
    return idf;
  }

  /**
   * Tokenize text into normalized tokens
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  /**
   * Find semantically similar operations for a requirement
   */
  async findSemanticMatches(options: SemanticMatchOptions): Promise<SemanticMatchResult[]> {
    const { requirement, operations, category, threshold = 0.3 } = options;
    
    if (operations.length === 0) {
      return [];
    }

    // Build corpus from all operation descriptions
    const corpusDocs = operations.map(op => 
      `${op.name} ${op.path} ${op.method} ${op.description || ''}`.toLowerCase()
    );
    
    // Compute requirement vector with synonyms and knowledge context
    const expandedRequirementText = expandRequirementWithSynonyms(requirement);
    
    const knowledgeParts: string[] = [];
    if (requirement.relatedFlows && requirement.relatedFlows.length > 0) {
      knowledgeParts.push(`flows: ${requirement.relatedFlows.join(',')}`);
    }
    if ((requirement as any).relatedBusinessRules && (requirement as any).relatedBusinessRules.length > 0) {
      knowledgeParts.push(`rules: ${(requirement as any).relatedBusinessRules.join(',')}`);
    }
    if ((requirement as any).relatedRuntimeVariables && (requirement as any).relatedRuntimeVariables.length > 0) {
      knowledgeParts.push(`variables: ${(requirement as any).relatedRuntimeVariables.join(',')}`);
    }
    
    const requirementText = [
      expandedRequirementText,
      ...knowledgeParts,
    ].join(' ');
    const reqVector = this.computeTfIdfVector(requirementText, corpusDocs);
    
    // Score each operation
    const results: SemanticMatchResult[] = [];
    
    for (const op of operations) {
      const expandedOpText = expandOperationWithSynonyms(op);
      const opText = expandedOpText.toLowerCase();
      const opVector = this.computeTfIdfVector(opText, corpusDocs);
      
      const similarity = this.cosineSimilarity(reqVector, opVector);
      
      if (similarity >= threshold) {
        results.push({
          operationId: op.id,
          operationName: op.name,
          operationPath: op.path,
          method: op.method,
          similarity,
          reasoning: this.generateReasoning(requirement, op, similarity, category),
        });
      }
    }
    
    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, 5); // Return top 5
  }

  /**
   * Generate human-readable reasoning for the match
   */
  private generateReasoning(
    requirement: RequirementEntity,
    operation: ApiOperationEntity,
    similarity: number,
    category?: StrategyCategory,
  ): string {
    const reasons: string[] = [];
    
    if (similarity >= 0.7) {
      reasons.push('Strong semantic similarity');
    } else if (similarity >= 0.5) {
      reasons.push('Moderate semantic similarity');
    } else {
      reasons.push('Weak semantic similarity');
    }
    
    // Check method alignment
    const reqText = requirement.title.toLowerCase();
    if (['create', 'register', 'add'].some(h => reqText.includes(h)) && operation.method === 'POST') {
      reasons.push('POST method aligns with create action');
    } else if (['get', 'fetch', 'list', 'read'].some(h => reqText.includes(h)) && operation.method === 'GET') {
      reasons.push('GET method aligns with read action');
    } else if (['update', 'modify'].some(h => reqText.includes(h)) && ['PUT', 'PATCH'].includes(operation.method)) {
      reasons.push(`${operation.method} method aligns with update action`);
    } else if (['delete', 'remove'].some(h => reqText.includes(h)) && operation.method === 'DELETE') {
      reasons.push('DELETE method aligns with delete action');
    }
    
    // Check path relevance
    const reqTokens = this.tokenize(requirement.title);
    const pathTokens = this.tokenize(operation.path);
    const matchingTokens = reqTokens.filter(t => pathTokens.includes(t));
    if (matchingTokens.length > 0) {
      reasons.push(`Path contains relevant tokens: ${matchingTokens.join(', ')}`);
    }
    
    if (category) {
      reasons.push(`Suitable for ${category} test category`);
    }
    
    // Add synonym-based reasoning
    const synonymReasons = getSynonymReasoning(requirement, operation);
    reasons.push(...synonymReasons);
    
    return reasons.join('; ');
  }

  /**
   * Decompose a complex requirement into discrete actions
   */
  decomposeRequirement(requirement: RequirementEntity): RequirementDecomposition[] {
    const title = requirement.title.toLowerCase();
    const description = (requirement.description || '').toLowerCase();
    const fullText = `${title} ${description}`;
    
    const decompositions: RequirementDecomposition[] = [];
    
    // Detect multi-step workflows
    const actionPatterns = [
      { pattern: /create.*(?:and|then).*?(?:list|get|fetch)/i, actions: ['create', 'read'] },
      { pattern: /add.*(?:and|then).*?(?:list|get|fetch)/i, actions: ['create', 'read'] },
      { pattern: /update.*(?:and|then).*?(?:get|fetch)/i, actions: ['update', 'read'] },
      { pattern: /delete.*(?:and|then).*?(?:list|get)/i, actions: ['delete', 'read'] },
      { pattern: /register.*(?:and|then).*?(?:login|authenticate)/i, actions: ['create', 'auth'] },
      { pattern: /upload.*(?:and|then).*?(?:list|get|fetch)/i, actions: ['create', 'read'] },
    ];
    
    let foundMultiStep = false;
    for (const { pattern, actions } of actionPatterns) {
      if (pattern.test(fullText)) {
        foundMultiStep = true;
        decompositions.push({
          requirement,
          actions: actions.map(action => ({
            action,
            description: this.getActionDescription(action, requirement),
            suggestedMethod: this.getMethodForAction(action),
          })),
          isMultiStep: true,
        });
        break;
      }
    }
    
    // Single action requirement
    if (!foundMultiStep) {
      const primaryAction = this.detectPrimaryAction(requirement);
      decompositions.push({
        requirement,
        actions: [{
          action: primaryAction,
          description: requirement.description || requirement.title,
          suggestedMethod: this.getMethodForAction(primaryAction),
        }],
        isMultiStep: false,
      });
    }
    
    return decompositions;
  }

  /**
   * Detect the primary action in a requirement
   */
  private detectPrimaryAction(requirement: RequirementEntity): string {
    const text = `${requirement.title} ${requirement.description || ''}`.toLowerCase();
    
    if (/\b(create|register|signup|sign-up|add|new)\b/.test(text)) return 'create';
    if (/\b(get|fetch|list|read|retrieve|search|find)\b/.test(text)) return 'read';
    if (/\b(update|modify|edit|change|patch)\b/.test(text)) return 'update';
    if (/\b(delete|remove|cancel)\b/.test(text)) return 'delete';
    if (/\b(login|authenticate|auth)\b/.test(text)) return 'auth';
    if (/\b(upload|import)\b/.test(text)) return 'create';
    
    return 'unknown';
  }

  /**
   * Get description for an action
   */
  private getActionDescription(action: string, requirement: RequirementEntity): string {
    const descriptions: Record<string, string> = {
      create: `Create resource: ${requirement.title}`,
      read: `Read/query resource: ${requirement.title}`,
      update: `Update resource: ${requirement.title}`,
      delete: `Delete resource: ${requirement.title}`,
      auth: `Authenticate for: ${requirement.title}`,
    };
    return descriptions[action] || requirement.title;
  }

  /**
   * Get suggested HTTP method for an action
   */
  private getMethodForAction(action: string): string {
    const methods: Record<string, string> = {
      create: 'POST',
      read: 'GET',
      update: 'PUT',
      delete: 'DELETE',
      auth: 'POST',
    };
    return methods[action] || 'GET';
  }
}

export interface RequirementDecomposition {
  requirement: RequirementEntity;
  actions: Array<{
    action: string;
    description: string;
    suggestedMethod: string;
  }>;
  isMultiStep: boolean;
}

export default SemanticOperationMatcher;