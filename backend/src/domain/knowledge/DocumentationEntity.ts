// DocumentationEntity - Domain Entity for Documentation in Knowledge Hub
// Free-form notes and documentation for the team.

export interface Documentation {
  id: string;
  projectId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  author: string;
  version: string;
  createdAt: number;
  updatedAt: number;
}

export default Documentation;