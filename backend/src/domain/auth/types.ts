export type UserRole = 'owner' | 'admin' | 'member';

/** Document shape for Atlas collection `userAuthentication` (JSON schema validation). */
export interface UserAuthenticationDocument {
  firstName: string;
  lastName: string;
  /** Email address (schema field `id`). */
  id: string;
  /** Bcrypt hash stored in schema field `password`. */
  password: string;
  createdDate: Date;
  isActive: boolean;
  /** App-only: tenant scope for projects (not in Atlas schema; allowed as extra field). */
  tenantId?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: UserRole;
}
