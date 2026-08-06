export interface ProjectRecord {
  id: string;
  name: string;
  projectKey: string;
  description?: string;
  status?: 'active' | 'archived';
  createdAt: number;
  updatedAt: number;
}

export default ProjectRecord;
