// Domain model for projects
export type ProjectStatus = 'active' | 'inactive';

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdDate: string;
  updatedDate: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
}