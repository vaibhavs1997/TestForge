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
  /** Last time a user opened the workspace. Kept server-side for shared recency. */
  lastOpenedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export default ProjectRecord;
