// HistoryAwareOperationMatcher - Enhances operation scoring with few-shot learning
// from user corrections and project-specific patterns

import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity';
import type { OperationMappingHistoryEntry } from '../../domain/requirements/OperationMappingHistoryEntity';
import type { OperationMappingHistoryRepository } from '../../domain/requirements/OperationMappingHistoryRepository';
import { getOperationMatchDiagnostics } from './RequirementOperationMatcher';
import { expandRequirementWithSynonyms } from './OperationMappingSynonyms';

// Local tokenize and requirementCorpus implementations to avoid changing exports
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/).filter((t) => t.length > 2);
}

function requirementCorpus(requirement: RequirementEntity): string {
  const expanded = expandRequirementWithSynonyms(requirement);
  const base = [
    requirement.title,
    requirement.description || '',
    ...(requirement.acceptanceCriteria || []),
  ].join(' ');
  return `${expanded} ${base}`;
}

export interface HistoryAwareScoreOptions {
  projectId: string;
  requirement: RequirementEntity;
  operations: ApiOperationEntity[];
  category?: StrategyCategory;
  historyRepository: OperationMappingHistoryRepository;
}

export interface EnhancedOperationMatchScore {
  operation: ApiOperationEntity;
  baseScore: number;
  historyBonus: number;
  finalScore: number;
  reasons: string[];
  similarAcceptedCount: number;
}

/**
 * Enhances operation matching with historical acceptance patterns.
 * Boosts operations that were historically accepted for similar requirements.
 */
export class HistoryAwareOperationMatcher {
  constructor(private readonly historyRepository: OperationMappingHistoryRepository) {}

  async scoreWithHistory(options: HistoryAwareScoreOptions): Promise<EnhancedOperationMatchScore[]> {
    const { projectId, requirement, operations, category } = options;
    const corpus = requirementCorpus(requirement).toLowerCase();
    const tokens = tokenize(corpus);

    // Get base diagnostics from deterministic matcher
    const diagnostics = getOperationMatchDiagnostics(requirement, operations);
    const baseRanked = diagnostics.ranked;

    // Find similar accepted patterns from history
    const similarPatterns = await this.historyRepository.findSimilarPatterns(projectId, tokens, 20);

    // Group by operationId and count accepts
    const acceptanceCounts = new Map<string, number>();
    for (const pattern of similarPatterns) {
      if (pattern.accepted) {
        acceptanceCounts.set(
          pattern.selectedOperationId,
          (acceptanceCounts.get(pattern.selectedOperationId) || 0) + 1,
        );
      }
    }

    // Enhance scores with history
    const enhanced: EnhancedOperationMatchScore[] = baseRanked.map((entry) => {
      const baseScore = entry.score;
      const historyBonus = this.calculateHistoryBonus(entry.operation.id, acceptanceCounts);
      const finalScore = baseScore + historyBonus;
      const reasons = [...entry.reasons];

      if (historyBonus > 0) {
        const count = acceptanceCounts.get(entry.operation.id) || 0;
        reasons.push(`Historically accepted ${count} time(s) for similar requirements (+${historyBonus})`);
      }

      return {
        operation: entry.operation,
        baseScore,
        historyBonus,
        finalScore,
        reasons,
        similarAcceptedCount: acceptanceCounts.get(entry.operation.id) || 0,
      };
    });

    // Sort by final score (descending)
    enhanced.sort((a, b) => b.finalScore - a.finalScore);

    return enhanced;
  }

  /**
   * Calculate history bonus based on acceptance patterns.
   * More accepts = higher bonus, capped at +5.
   */
  private calculateHistoryBonus(operationId: string, acceptanceCounts: Map<string, number>): number {
    const count = acceptanceCounts.get(operationId) || 0;
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count === 3) return 3;
    return Math.min(5, 3 + Math.floor(count / 2));
  }

  /**
   * Get acceptance rate statistics for a project.
   */
  async getProjectStats(projectId: string): Promise<{
    totalMappings: number;
    acceptedMappings: number;
    acceptanceRate: number;
    topOperations: Array<{ operationId: string; count: number }>;
  }> {
    const stats = await this.historyRepository.getAcceptanceRate(projectId);
    
    // Get top operations
    const allHistory = await this.historyRepository.findByProject(projectId, 100);
    const operationCounts = new Map<string, number>();
    for (const entry of allHistory) {
      if (entry.accepted) {
        operationCounts.set(
          entry.selectedOperationId,
          (operationCounts.get(entry.selectedOperationId) || 0) + 1,
        );
      }
    }

    const topOperations = Array.from(operationCounts.entries())
      .map(([operationId, count]) => ({ operationId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalMappings: stats.total,
      acceptedMappings: stats.accepted,
      acceptanceRate: stats.rate,
      topOperations,
    };
  }
}

export default HistoryAwareOperationMatcher;