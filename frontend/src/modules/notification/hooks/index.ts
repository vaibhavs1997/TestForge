// Notification hooks - migrated to TanStack Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services';
import { queryKeys } from '../../../constants';
import { projectService } from '../../../services/ProjectService';
import { auditService } from '../../audit/services';
import { mapAuditLogsToInbox } from '../utils/mapAuditToInbox';
import type { NotificationInboxItem } from '../types/inbox';

const INBOX_QUERY_KEY = ['notification-inbox'] as const;
const INBOX_LIMIT = 50;

export function useNotificationInbox() {
  return useQuery({
    queryKey: INBOX_QUERY_KEY,
    queryFn: async (): Promise<NotificationInboxItem[]> => {
      const projects = await projectService.listProjects();
      const logsByProject = await Promise.all(
        projects.map((project) =>
          auditService.getAuditLogs(project.id).catch(() => []),
        ),
      );
      const merged = logsByProject.flat();
      return mapAuditLogsToInbox(merged)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, INBOX_LIMIT);
    },
    staleTime: 30_000,
  });
}

export function useNotifications(projectId: string | null) {
  const queryKey = queryKeys.notifications(projectId || '');

  return useQuery({
    queryKey,
    queryFn: () => notificationService.listNotifications(projectId || ''),
    enabled: !!projectId,
  });
}

export function useProviders(projectId: string | null) {
  const queryKey = queryKeys.providers(projectId || '');

  return useQuery({
    queryKey,
    queryFn: () => notificationService.listProviders(projectId || ''),
    enabled: !!projectId,
  });
}

export const useNotificationMutations = (projectId?: string) => {
  const queryClient = useQueryClient();
  const notificationsKey = queryKeys.notifications(projectId || '');

  const createMutation = useMutation({
    mutationFn: (payload: any) => notificationService.createNotification(projectId || '', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { notificationId: string; data: any }) =>
      notificationService.updateNotification(payload.notificationId, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsKey });
    },
  });

  return {
    createNotification: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateNotification: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteNotification: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};