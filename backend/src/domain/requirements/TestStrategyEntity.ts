// TestStrategyEntity - Domain Entity for Test Strategy Planning
// Determines WHAT should be tested for an Approved Requirement.
// Does NOT generate test cases.

export type StrategyCategory = 
  | 'Positive'
  | 'Negative'
  | 'Boundary'
  | 'Business Rules'
  | 'Security'
  | 'Validation'
  | 'Error Handling'
  | 'Integration'
  | 'Regression'
  | 'Performance'
  | 'Accessibility'
  | 'Localization';

export type StrategyPriority = 'High' | 'Medium' | 'Low';
export type StrategyStatus = 'Enabled' | 'Disabled';

export interface StrategyItem {
  id: string;
  title: string;
  reason: string;
  relatedApis: string[];
  relatedData: string[];
  priority: StrategyPriority;
  status: StrategyStatus;
  /** HTTP status code expected when this scenario is executed. */
  expectedHttpStatus?: number;
  /** Simplified type for UI (Positive / Negative / Security). */
  testCaseType?: 'Positive' | 'Negative' | 'Security';
  focusFieldId?: string;
  scenarioKind?: 'missing_field' | 'invalid_field' | 'duplicate' | 'default';
  acceptanceCriterionId?: string;
  scenarioId?: string;
}

export interface StrategyCategorySection {
  category: StrategyCategory;
  items: StrategyItem[];
}

export class TestStrategyEntity {
  constructor(
    public readonly id: string,
    public readonly requirementId: string,
    public readonly projectId: string,
    public readonly sections: StrategyCategorySection[],
    public readonly createdAt: number,
    public readonly updatedAt: number
  ) {}
}

export default TestStrategyEntity;
