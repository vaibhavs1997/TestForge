import type { Request } from 'express';
import type { ProjectRecord } from '../../domain/project/ProjectRecord.js';
import { getAuthConfig } from '../../config.js';
import type { AuthContext } from './auth.js';

/** JWT users with full access (shared API key). */
export function hasGlobalProjectAccess(auth: AuthContext | undefined): boolean {
  if (!auth) return false;
  return auth.projectIds === '*';
}

export function getAuthSubject(req: Request): string | undefined {
  return req.auth?.subject;
}

export function getAuthTenantId(req: Request): string | undefined {
  return req.auth?.tenantId;
}

/** Whether the caller may access a project (sync: JWT project list only). */
export function isProjectIdInAuthScope(auth: AuthContext | undefined, projectId: string): boolean {
  if (!auth) return true;
  if (auth.projectIds === '*') return true;
  if (!auth.projectIds.length) return false;
  return auth.projectIds.includes(projectId);
}

/** Owner-based access for projects created under this user. */
export function isProjectOwnedBySubject(project: ProjectRecord, subject: string | undefined): boolean {
  if (!subject || !project.ownerId) return false;
  return project.ownerId === subject;
}

export function isProjectInTenant(project: ProjectRecord, tenantId: string | undefined): boolean {
  if (!tenantId || !project.tenantId) return false;
  return project.tenantId === tenantId;
}

/**
 * Projects visible in list/create flows when auth is enabled.
 */
export function filterProjectsForAuth(
  projects: ProjectRecord[],
  auth: AuthContext | undefined,
): ProjectRecord[] {
  const authConfig = getAuthConfig();
  if (!authConfig.enabled || !auth) {
    return projects;
  }
  if (hasGlobalProjectAccess(auth)) {
    return projects;
  }

  const subject = auth.subject;


  return projects.filter((p) => {

    if (isProjectIdInAuthScope(auth, p.id)) return true;
    if (isProjectOwnedBySubject(p, subject)) return true;
    return false;
  });
}

export async function canAccessProject(
  project: ProjectRecord | null,
  auth: AuthContext | undefined,
): Promise<boolean> {
  const authConfig = getAuthConfig();
  if (!authConfig.enabled || !auth) {
    return true;
  }
  if (!project) return false;
  if (hasGlobalProjectAccess(auth)) return true;

  if (isProjectIdInAuthScope(auth, project.id)) return true;
  if (isProjectOwnedBySubject(project, auth.subject)) return true;
  return false;
}
