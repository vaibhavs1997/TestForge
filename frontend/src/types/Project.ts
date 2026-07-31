// Type definitions for Project domain

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  apis: string[];
  environments: string[];
  createdAt: string;
  updatedAt: string;
}
