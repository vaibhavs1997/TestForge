// BusinessRuleEntity - Domain Entity for Business Rules in Knowledge Hub
// Captures business rules that govern system behavior.

export interface BusinessRule {
  id: string;
  projectId: string;
  name: string;
  description: string;
  ruleType: string;
  condition: string;
  expectedOutcome: string;
  severity: 'High' | 'Medium' | 'Low';
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export default BusinessRule;