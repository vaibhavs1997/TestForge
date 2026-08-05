// Project Context hooks - migrated to TanStack Query
import { useQuery } from '@tanstack/react-query';
import { projectContextService } from '../services';
import { queryKeys } from '../../../constants';

export function useProjectContext(projectId: string | null) {
  const queryKey = queryKeys.projectContext(projectId || '');

  const { data: context = null, isLoading: loading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return null;
      return projectContextService.getProjectContext(projectId);
    },
    enabled: !!projectId,
  });

  return { context, loading, isLoading: loading, isError, error, refetch };
}