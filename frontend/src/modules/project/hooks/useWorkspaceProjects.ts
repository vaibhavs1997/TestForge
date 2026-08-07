import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectService, type Project } from '../../../services/ProjectService';
import { queryKeys } from '../../../constants';

export function useWorkspaceProjects() {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.projects;

  const query = useQuery({
    queryKey,
    queryFn: () => projectService.listProjects(),
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      projectService.createProject({
        name: data.name,
        description: data.description,
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name?: string; description?: string; status?: 'active' | 'archived' }) =>
      projectService.updateProject(data.id, {
        name: data.name,
        description: data.description,
        status: data.status,
      } as Partial<Project> & { status?: 'active' | 'archived' }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: invalidate,
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    createProjectAsync: createMutation.mutateAsync,
    updateProjectAsync: updateMutation.mutateAsync,
    deleteProjectAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useWorkspaceProjects;
