// BatchOperationOptimizer - Optimizes API operation mapping across all requirements in a project
// Ensures diverse test coverage and identifies unmapped operations

import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { OperationMappingHistoryRepository } from '../../domain/requirements/OperationMappingHistoryRepository';
import { SemanticOperationMatcher, RequirementDecomposition } from './SemanticOperationMatcher';
import { HistoryAwareOperationMatcher } from './HistoryAwareOperationMatcher';

export interface BatchOptimizationResult {
  requirementMappings: Array<{
    requirementId: string;
    requirementTitle: string;
    recommendedOperationId: string;
    confidence: number;
    reasoning: string[];
    isMultiStep: boolean;
    actions?: Array<{
      action: string;
      suggestedOperationId?: string;
      suggestedMethod: string;
    }>;
  }>;
  unmappedOperations: Array<{
    operationId: string;
    operationName: string;
    operationPath: string;
    method: string;
  }>;
  coverageStats: {
    totalRequirements: number;
    mappedRequirements: number;
    unmappedRequirements: number;
    totalOperations: number;
    mappedOperations: number;
    unmappedOperationsCount: number;
    coveragePercentage: number;
  };
  recommendations: string[];
}

export interface BatchOptimizationOptions {
  projectId: string;
  requirements: RequirementEntity[];
  operations: ApiOperationEntity[];
  historyRepository: OperationMappingHistoryRepository;
  category?: string;
}

/**
 * Optimizes API operation mapping across a project's requirements.
 * Ensures diverse coverage and identifies gaps.
 */
export class BatchOperationOptimizer {
  private semanticMatcher: SemanticOperationMatcher;
  private historyMatcher: HistoryAwareOperationMatcher;
  private historyRepository: OperationMappingHistoryRepository;

  constructor(historyRepository: OperationMappingHistoryRepository) {
    this.semanticMatcher = new SemanticOperationMatcher();
    this.historyMatcher = new HistoryAwareOperationMatcher(historyRepository);
    this.historyRepository = historyRepository;
  }

  async optimize(options: BatchOptimizationOptions): Promise<BatchOptimizationResult> {
    const { projectId, requirements, operations, category } = options;
    
    const requirementMappings: BatchOptimizationResult['requirementMappings'] = [];
    const usedOperationIds = new Set<string>();
    const unmappedRequirements: string[] = [];
    const recommendations: string[] = [];

    // Process each requirement
    for (const requirement of requirements) {
      try {
        const mapping = await this.mapRequirement(requirement, operations, category, usedOperationIds);
        requirementMappings.push(mapping);
        
        if (mapping.recommendedOperationId) {
          usedOperationIds.add(mapping.recommendedOperationId);
          
          // Track multi-step action operations
          if (mapping.actions) {
            for (const action of mapping.actions) {
              if (action.suggestedOperationId) {
                usedOperationIds.add(action.suggestedOperationId);
              }
            }
          }
        } else {
          unmappedRequirements.push(requirement.id);
        }
      } catch (error) {
        unmappedRequirements.push(requirement.id);
      }
    }

    // Identify unmapped operations
    const unmappedOps: BatchOptimizationResult['unmappedOperations'] = operations
      .filter(op => !usedOperationIds.has(op.id))
      .map(op => ({
        operationId: op.id,
        operationName: op.name,
        operationPath: op.path,
        method: op.method,
      }));

    // Generate recommendations
    if (unmappedRequirements.length > 0) {
      recommendations.push(
        `${unmappedRequirements.length} requirement(s) could not be mapped to any API operation. Review their descriptions.`
      );
    }

    if (unmappedOps.length > 0) {
      recommendations.push(
        `${unmappedOps.length} API operation(s) are not covered by any requirement. Consider creating requirements for these endpoints.`
      );
    }

    // Check for over-concentration
    const operationUsageCounts = new Map<string, number>();
    for (const mapping of requirementMappings) {
      if (mapping.recommendedOperationId) {
        operationUsageCounts.set(
          mapping.recommendedOperationId,
          (operationUsageCounts.get(mapping.recommendedOperationId) || 0) + 1
        );
      }
    }

    const overusedOps = Array.from(operationUsageCounts.entries())
      .filter(([, count]) => count > 3)
      .map(([opId]) => opId);

    if (overusedOps.length > 0) {
      recommendations.push(
        `${overusedOps.length} operation(s) are used by 4+ requirements. Consider diversifying test coverage.`
      );
    }

    // Calculate coverage stats
    const coverageStats = {
      totalRequirements: requirements.length,
      mappedRequirements: requirementMappings.filter(m => m.recommendedOperationId).length,
      unmappedRequirements: unmappedRequirements.length,
      totalOperations: operations.length,
      mappedOperations: usedOperationIds.size,
      unmappedOperationsCount: unmappedOps.length,
      coveragePercentage: operations.length > 0 
        ? Math.round((usedOperationIds.size / operations.length) * 100) 
        : 0,
    };

    return {
      requirementMappings,
      unmappedOperations: unmappedOps,
      coverageStats,
      recommendations,
    };
  }

  /**
   * Map a single requirement to an operation with diversity awareness
   */
  private async mapRequirement(
    requirement: RequirementEntity,
    operations: ApiOperationEntity[],
    category: string | undefined,
    usedOperationIds: Set<string>,
  ): Promise<BatchOptimizationResult['requirementMappings'][0]> {
    // Get history-aware scores
    const historyScores = await this.historyMatcher.scoreWithHistory({
      projectId: requirement.projectId,
      requirement,
      operations,
      category: category as any,
      historyRepository: this.historyRepository,
    });

    const topHistoryMatch = historyScores[0];
    
    // Try to find an unused operation first
    const unusedMatch = historyScores.find(s => !usedOperationIds.has(s.operation.id));
    const bestMatch = unusedMatch || topHistoryMatch;

    if (!bestMatch) {
      return {
        requirementId: requirement.id,
        requirementTitle: requirement.title,
        recommendedOperationId: '',
        confidence: 0,
        reasoning: ['No suitable operation found'],
        isMultiStep: false,
      };
    }

    // Decompose requirement if complex
    const decomposition = this.semanticMatcher.decomposeRequirement(requirement);
    const isMultiStep = decomposition[0]?.isMultiStep || false;

    const actions = isMultiStep && decomposition[0]?.actions
      ? decomposition[0].actions.map(action => ({
          action: action.action,
          suggestedOperationId: this.findOperationForMethod(operations, action.suggestedMethod)?.id,
          suggestedMethod: action.suggestedMethod,
        }))
      : undefined;

    return {
      requirementId: requirement.id,
      requirementTitle: requirement.title,
      recommendedOperationId: bestMatch.operation.id,
      confidence: Math.min(1, bestMatch.finalScore / 10),
      reasoning: bestMatch.reasons,
      isMultiStep,
      actions,
    };
  }

  /**
   * Find an operation matching a specific HTTP method
   */
  private findOperationForMethod(operations: ApiOperationEntity[], method: string): ApiOperationEntity | undefined {
    return operations.find(op => op.method === method);
  }
}

export default BatchOperationOptimizer;