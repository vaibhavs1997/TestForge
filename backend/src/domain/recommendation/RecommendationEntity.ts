// RecommendationEntity - Domain Entity for AI Recommendation Engine
// Represents a deterministic recommendation for project improvement.

export type RecommendationCategory = 
  | 'Missing Test Data'
  | 'Missing Environment'
  | 'Missing Runtime Variable'
  | 'Weak Assertions'
  | 'Missing Negative Tests'
  | 'Missing Security Tests'
  | 'Missing Boundary Tests'
  | 'Missing Business Rules'
  | 'Unused APIs'
  | 'Unmapped Datasets'
  | 'Missing Knowledge Flows'
  | 'Missing Dependencies';

export type RecommendationPriority = 'High' | 'Medium' | 'Low';

export type RecommendationStatus = 'Pending' | 'Accepted' | 'Dismissed' | 'Marked Later';

export interface Recommendation {
  id: string;
  projectId: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  reason: string;
  suggestedAction: string;
  affectedRequirementIds: string[];
  affectedApiOperationIds: string[];
  status: RecommendationStatus;
  createdAt: number;
  updatedAt: number;
}
