// TanStack Query hooks for Population Profiles
import { useCRUD } from '../../../hooks/useCRUD';
import { profileService } from '../services/profileService';
import type { PopulationProfileDto } from '../services/profileService';
import { queryKeys } from '../../../constants';

// ─── Profiles ──────────────────────────────────────────────────

export const useProfiles = (projectId?: string, datasetId?: string) => {
  const { data, isLoading, isError, error, create, update, remove, isCreating, isUpdating, isDeleting } = useCRUD({
    queryKey: queryKeys.profiles(projectId || '', datasetId || ''),
    service: {
      list: () => (projectId ? profileService.listProfiles(projectId, datasetId) : Promise.resolve([])),
      create: (input: { projectId: string; datasetId: string; columnId: string; strategyType: string; configuration?: Record<string, any> }) =>
        profileService.createProfile(input.projectId, {
          datasetId: input.datasetId,
          columnId: input.columnId,
          strategyType: input.strategyType,
          configuration: input.configuration,
        }),
      update: (profileId: string, input: { strategyType?: string; configuration?: Record<string, any> }) =>
        profileService.updateProfile(projectId || '', profileId, input),
      delete: (profileId: string) => profileService.deleteProfile(projectId || '', profileId),
    },
    enabled: !!projectId,
  });

  return {
    profiles: data,
    isLoading,
    isError,
    error,
    create,
    createAsync: create,
    isCreating,
    update,
    updateAsync: update,
    isUpdating,
    remove,
    removeAsync: remove,
    isDeleting,
  };
};

export default useProfiles;