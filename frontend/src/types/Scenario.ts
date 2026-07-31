// Type definitions for Scenario domain

export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  id: string;
  action: string;
  target: string;
  expected: string;
}
