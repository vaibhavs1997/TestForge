// TanStack Query hooks for Scheduler module
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services';
import type { Schedule, ScheduleFormData } from '../types';
import { queryKeys } from '../../../constants';

export const useSchedules = (projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.schedules(projectId || '');

  const { data: schedules = [], isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!projectId) return [];
      return scheduleService.listSchedules(projectId);
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { projectId: string } & ScheduleFormData) =>
      scheduleService.createSchedule(data.projectId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ scheduleId, projectId, ...data }: { scheduleId: string; projectId: string } & Partial<ScheduleFormData>) =>
      scheduleService.updateSchedule(projectId, scheduleId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ projectId, scheduleId }: { projectId: string; scheduleId: string }) =>
      scheduleService.deleteSchedule(projectId, scheduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const runNowMutation = useMutation({
    mutationFn: ({ projectId, scheduleId }: { projectId: string; scheduleId: string }) =>
      scheduleService.runNow(projectId, scheduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Optimistic enable (safe, non-destructive)
  const enableMutation = useMutation({
    mutationFn: ({ projectId, scheduleId }: { projectId: string; scheduleId: string }) =>
      scheduleService.enableSchedule(projectId, scheduleId),
    onMutate: async ({ scheduleId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Schedule[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Schedule[]>(queryKey, (old) =>
          (old || []).map((s) => (s.id === scheduleId ? { ...s, enabled: true } : s))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Optimistic disable (safe, non-destructive)
  const disableMutation = useMutation({
    mutationFn: ({ projectId, scheduleId }: { projectId: string; scheduleId: string }) =>
      scheduleService.disableSchedule(projectId, scheduleId),
    onMutate: async ({ scheduleId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Schedule[]>(queryKey);
      if (previous) {
        queryClient.setQueryData<Schedule[]>(queryKey, (old) =>
          (old || []).map((s) => (s.id === scheduleId ? { ...s, enabled: false } : s))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    schedules,
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
    runNow: runNowMutation.mutate,
    runNowAsync: runNowMutation.mutateAsync,
    isRunning: runNowMutation.isPending,
    enable: enableMutation.mutate,
    enableAsync: enableMutation.mutateAsync,
    isEnabling: enableMutation.isPending,
    disable: disableMutation.mutate,
    disableAsync: disableMutation.mutateAsync,
    isDisabling: disableMutation.isPending,
  };
};

export default useSchedules;