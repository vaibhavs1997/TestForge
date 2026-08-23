import React from 'react';
import { notificationService } from '../services';
import type { Notification, NotificationFormData, Provider } from '../types';

export interface UseNotificationPageArgs {
  projectId: string | null;
  notifications: Notification[];
  providers: Provider[];
  createNotification: (payload: NotificationFormData) => Promise<unknown>;
  updateNotification: (payload: { notificationId: string; data: Partial<NotificationFormData> }) => Promise<unknown>;
  deleteNotification: (notificationId: string) => Promise<unknown>;
}

const createDefaultFormData = (providerId = ''): NotificationFormData => ({
  name: '',
  eventType: 'ExecutionCompleted',
  providerId,
  recipients: [],
  subjectTemplate: 'Test execution {{status}}',
  bodyTemplate: 'Execution run {{executionRunId}} completed with status: {{status}}',
  enabled: true,
});

export function useNotificationPage({
  projectId,
  notifications,
  providers,
  createNotification,
  updateNotification,
  deleteNotification,
}: UseNotificationPageArgs) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingNotification, setEditingNotification] = React.useState<Notification | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [formData, setFormData] = React.useState<NotificationFormData>(() => createDefaultFormData(providers[0]?.id || ''));

  const filteredNotifications = React.useMemo(
    () =>
      notifications.filter((notification) =>
        notification.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [notifications, searchQuery],
  );

  const handleCreate = React.useCallback(() => {
    setEditingNotification(null);
    setFormData(createDefaultFormData(providers[0]?.id || ''));
    setIsModalOpen(true);
  }, [providers]);

  const handleEdit = React.useCallback((notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      name: notification.name,
      eventType: notification.eventType,
      providerId: notification.providerId,
      recipients: notification.recipients,
      subjectTemplate: notification.subjectTemplate,
      bodyTemplate: notification.bodyTemplate,
      enabled: notification.enabled,
    });
    setIsModalOpen(true);
  }, []);

  const handleDuplicate = React.useCallback(
    async (notification: Notification) => {
      const duplicated: NotificationFormData = {
        name: `${notification.name} (Copy)`,
        eventType: notification.eventType,
        providerId: notification.providerId,
        recipients: [...notification.recipients],
        subjectTemplate: notification.subjectTemplate,
        bodyTemplate: notification.bodyTemplate,
        enabled: false,
      };
      await createNotification(duplicated);
    },
    [createNotification],
  );

  const handleDelete = React.useCallback(async () => {
    if (!deleteId) return;
    await deleteNotification(deleteId);
    setDeleteOpen(false);
    setDeleteId(null);
  }, [deleteId, deleteNotification]);

  const handleToggleEnabled = React.useCallback(
    async (notification: Notification) => {
      await updateNotification({
        notificationId: notification.id,
        data: { enabled: !notification.enabled },
      });
    },
    [updateNotification],
  );

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!projectId) return;

      try {
        if (editingNotification) {
          await updateNotification({ notificationId: editingNotification.id, data: formData });
        } else {
          await createNotification(formData);
        }
        setIsModalOpen(false);
      } catch (err) {
        console.error('Failed to save notification:', err);
      }
    },
    [createNotification, editingNotification, formData, projectId, updateNotification],
  );

  const handleTest = React.useCallback(async (id: string) => {
    try {
      await notificationService.testNotification(id);
      alert('Test notification triggered successfully');
    } catch (err) {
      console.error('Failed to test notification:', err);
      alert('Failed to trigger test notification');
    }
  }, []);

  return {
    isModalOpen,
    setIsModalOpen,
    editingNotification,
    deleteId,
    setDeleteId,
    deleteOpen,
    setDeleteOpen,
    searchQuery,
    setSearchQuery,
    formData,
    setFormData,
    filteredNotifications,
    handleCreate,
    handleEdit,
    handleDuplicate,
    handleDelete,
    handleToggleEnabled,
    handleSubmit,
    handleTest,
    createDefaultFormData,
  };
}

export default useNotificationPage;
