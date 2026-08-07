import { useParams } from 'react-router-dom';
import { projectStore } from '../store/projectStore';

/**
 * Active project id from the URL (preferred) or last selected project in this user's session.
 * Never falls back to a shared default project id.
 */
export function useActiveProjectId(): string | undefined {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const selectedProjectId = projectStore((s) => s.selectedProjectId);
  return routeProjectId ?? selectedProjectId ?? undefined;
}

export default useActiveProjectId;
