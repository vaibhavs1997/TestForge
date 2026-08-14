// LlmOperationMappingService - AI-powered API operation mapping using LLM
// Provides structured suggestions with reasoning for requirement-to-operation mapping

import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity';
import { AIProviderResolutionService } from '../ai-provider/AIProviderResolutionService';
import type { AIProviderEntity } from '../../domain/ai-provider';
import { pickOperationForCategory, rankOperationsForRequirement } from './RequirementOperationMatcher';

export interface LlmMappingSuggestion {
  operationId: string;
  operationName: string;
  operationPath: string;
  method: string;
  confidence: number;
  reasoning: string;
  category?: string;
}

export interface LlmMappingResult {
  suggestions: LlmMappingSuggestion[];
  topSuggestion: LlmMappingSuggestion | null;
  lowConfidence: boolean;
  fallbackUsed: boolean;
}

export class LlmOperationMappingService {
  constructor(private readonly aiProviderService: AIProviderResolutionService) {}

  async suggestOperationMapping(
    requirement: RequirementEntity,
    operations: ApiOperationEntity[],
    category: StrategyCategory,
    aiProvider: AIProviderEntity | null,
  ): Promise<LlmMappingResult> {
    // If no AI provider or provider disabled, fall back to deterministic matching
    if (!aiProvider || !aiProvider.enabled) {
      const ranked = rankOperationsForRequirement(requirement, operations);
      const top = ranked[0];
      if (!top) {
        return {
          suggestions: [],
          topSuggestion: null,
          lowConfidence: true,
          fallbackUsed: true,
        };
      }
      return {
        suggestions: [{
          operationId: top.id,
          operationName: top.name,
          operationPath: top.path,
          method: top.method,
          confidence: 0.5,
          reasoning: 'Deterministic fallback (AI provider not configured)',
          category,
        }],
        topSuggestion: {
          operationId: top.id,
          operationName: top.name,
          operationPath: top.path,
          method: top.method,
          confidence: 0.5,
          reasoning: 'Deterministic fallback (AI provider not configured)',
          category,
        },
        lowConfidence: true,
        fallbackUsed: true,
      };
    }

    // Build prompt for LLM
    const operationsList = operations.map(op => ({
      id: op.id,
      name: op.name,
      path: op.path,
      method: op.method,
      description: op.description || '',
      authenticationType: op.authenticationType || 'None',
    }));

    const prompt = this.buildMappingPrompt(requirement, operationsList, category);

    try {
      const result = await this.aiProviderService.generate(aiProvider, [
        {
          role: 'system',
          content: 'You are an API testing expert. Suggest the best API operation for a given requirement and test category. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const parsed = this.parseLlmResponse(result.content, operations);
      return {
        ...parsed,
        fallbackUsed: false,
      };
    } catch (error) {
      // Fallback to deterministic matching on LLM failure
      const ranked = rankOperationsForRequirement(requirement, operations);
      const top = ranked[0];
      if (!top) {
        return {
          suggestions: [],
          topSuggestion: null,
          lowConfidence: true,
          fallbackUsed: true,
        };
      }
      return {
        suggestions: [{
          operationId: top.id,
          operationName: top.name,
          operationPath: top.path,
          method: top.method,
          confidence: 0.4,
          reasoning: `LLM suggestion failed, using deterministic fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
          category,
        }],
        topSuggestion: {
          operationId: top.id,
          operationName: top.name,
          operationPath: top.path,
          method: top.method,
          confidence: 0.4,
          reasoning: `LLM suggestion failed, using deterministic fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
          category,
        },
        lowConfidence: true,
        fallbackUsed: true,
      };
    }
  }

  private buildMappingPrompt(
    requirement: RequirementEntity,
    operations: Array<{
      id: string;
      name: string;
      path: string;
      method: string;
      description: string;
      authenticationType: string;
    }>,
    category: StrategyCategory,
  ): string {
    const operationsText = operations.map(op => 
      `- [${op.method}] ${op.path} (${op.name}): ${op.description || 'No description'} [Auth: ${op.authenticationType}]`
    ).join('\n');

    const knowledgeContext: string[] = [];
    if (requirement.relatedFlows && requirement.relatedFlows.length > 0) {
      knowledgeContext.push(`Knowledge Flows: ${requirement.relatedFlows.join(', ')}`);
    }
    if ((requirement as any).relatedBusinessRules && (requirement as any).relatedBusinessRules.length > 0) {
      knowledgeContext.push(`Business Rules: ${(requirement as any).relatedBusinessRules.join(', ')}`);
    }
    if ((requirement as any).relatedRuntimeVariables && (requirement as any).relatedRuntimeVariables.length > 0) {
      knowledgeContext.push(`Runtime Variables: ${(requirement as any).relatedRuntimeVariables.join(', ')}`);
    }

    return `Given the following requirement and available API operations, suggest the best operation for a "${category}" test case.

Requirement: ${requirement.title}
Description: ${requirement.description || 'No description'}
Acceptance Criteria: ${(requirement.acceptanceCriteria || []).join('; ') || 'None specified'}
${knowledgeContext.length > 0 ? `\nKnowledge Context:\n${knowledgeContext.join('\n')}` : ''}

Available Operations:
${operationsText}

Instructions:
1. Consider the requirement text, HTTP method semantics, and test category
2. For "${category}" tests, prefer:
   - POST for create/positive tests
   - PUT/PATCH for update/validation tests
   - GET for read/positive tests
   - DELETE for delete tests
   - Authenticated endpoints for security tests
3. Provide reasoning for your suggestion
4. Return JSON with this structure:
{
  "suggestions": [
    {
      "operationId": "the-id-from-the-list",
      "confidence": 0.0-1.0,
      "reasoning": "why this operation matches the requirement"
    }
  ]
}

Return exactly 3 suggestions ranked by confidence.`;
  }

  private parseLlmResponse(
    content: string,
    operations: ApiOperationEntity[],
  ): LlmMappingResult {
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid LLM response structure: missing suggestions array');
      }

      const suggestions: LlmMappingSuggestion[] = parsed.suggestions
        .slice(0, 3)
        .map((s: any) => {
          const operation = operations.find(op => op.id === s.operationId);
          if (!operation) return null;
          return {
            operationId: operation.id,
            operationName: operation.name,
            operationPath: operation.path,
            method: operation.method,
            confidence: Math.min(1, Math.max(0, s.confidence || 0.5)),
            reasoning: s.reasoning || 'No reasoning provided',
            category: s.category,
          };
        })
        .filter((s: LlmMappingSuggestion | null): s is LlmMappingSuggestion => s !== null);

      const topSuggestion = suggestions[0] || null;
      const lowConfidence = topSuggestion ? topSuggestion.confidence < 0.7 : true;

      return {
        suggestions,
        topSuggestion,
        lowConfidence,
        fallbackUsed: false,
      };
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default LlmOperationMappingService;