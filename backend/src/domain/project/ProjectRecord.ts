export interface ProjectRecord {
  id: string;
  name: string;
  projectKey: string;
  description?: string;
  status?: 'active' | 'archived';
  /** Set when created by an authenticated user (JWT sub). */
  ownerId?: string;
  /** Organization / tenant — projects are isolated per tenant. */
  tenantId?: string;
  createdAt: number;
  updatedAt: number;
}

export default ProjectRecord;
