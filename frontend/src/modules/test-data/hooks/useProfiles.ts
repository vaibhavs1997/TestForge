// TanStack Query hooks for Population Profiles
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import type { PopulationProfileDto } from '../services/profileService';
import { queryKeys } from '../../../constants';

// ─── Profiles ──────────────────────────────────────────────────

export const useProfiles = (projectId?: string, datasetId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.profiles(projectId || '', datasetId || '');

  const { data: profiles = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      const result = await profileService.listProfiles(projectId, datasetId);
      return result;
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string; datasetId: string; columnId: string; strategyType: string; configuration?: Record<string, any> }) =>
      profileService.createProfile(data.projectId, {
        datasetId: data.datasetId,
        columnId: data.columnId,
        strategyType: data.strategyType,
        configuration: data.configuration,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ profileId, ...data }: { profileId: string } & { strategyType?: string; configuration?: Record<string, any> }) =>
      profileService.updateProfile(projectId || '', profileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (profileId: string) => profileService.deleteProfile(projectId || '', profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    profiles,
    isLoading,
    isError,
    error,
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};

export default useProfiles;