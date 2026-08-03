// NotificationPage - CRUD interface for managing notifications
import { useState, useEffect, useCallback } from 'react';
import { useNotifications, useProviders } from '../hooks';
import { notificationService } from '../services';
import type { Notification, NotificationFormData, Provider } from '../types';
import { useParams } from 'react-router-dom';

export function NotificationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { notifications, loading, error, refetch } = useNotifications(projectId || null);
  const { providers } = useProviders(projectId || null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<NotificationFormData>({
    name: '',
    eventType: 'ExecutionCompleted',
    providerId: '',
    recipients: [],
    subjectTemplate: '',
    bodyTemplate: '',
    enabled: true,
  });

  const filteredNotifications = notifications.filter(n =>
    n.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = useCallback(() => {
    setEditingNotification(null);
    setFormData({
      name: '',
      eventType: 'ExecutionCompleted',
      providerId: providers[0]?.id || '',
      recipients: [],
      subjectTemplate: 'Test execution {{status}}',
      bodyTemplate: 'Execution run {{executionRunId}} completed with status: {{status}}',
      enabled: true,
    });
    setIsModalOpen(true);
  }, [providers]);

  const handleEdit = useCallback((notification: Notification) => {
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

  const handleDuplicate = useCallback(async (notification: Notification) => {
    const duplicated: NotificationFormData = {
      name: `${notification.name} (Copy)`,
      eventType: notification.eventType,
      providerId: notification.providerId,
      recipients: [...notification.recipients],
      subjectTemplate: notification.subjectTemplate,
      bodyTemplate: notification.bodyTemplate,
      enabled: false,
    };
    await notificationService.createNotification(notification.projectId, duplicated);
    refetch();
  }, [refetch]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;
    await notificationService.deleteNotification(id);
    refetch();
  }, [refetch]);

  const handleToggleEnabled = useCallback(async (notification: Notification) => {
    await notificationService.updateNotification(notification.id, { enabled: !notification.enabled });
    refetch();
  }, [refetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      if (editingNotification) {
        await notificationService.updateNotification(editingNotification.id, formData);
      } else {
        await notificationService.createNotification(projectId, formData);
      }
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Failed to save notification:', err);
    }
  };

  const handleTest = async (id: string) => {
    try {
      await notificationService.testNotification(id);
      alert('Test notification triggered successfully');
    } catch (err) {
      console.error('Failed to test notification:', err);
      alert('Failed to trigger test notification');
    }
  };

  if (loading) return <div className="p-4">Loading notifications...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Notification
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enabled</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <tr key={notification.id}>
                <td className="px-6 py-4 whitespace-nowrap">{notification.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                    {notification.eventType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {providers.find(p => p.id === notification.providerId)?.name || notification.providerId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleToggleEnabled(notification)}
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      notification.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {notification.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleTest(notification.id)}
                    className="text-blue-600 hover:text-blue-800 mr-2"
                  >
                    Test
                  </button>
                  <button
                    onClick={() => handleEdit(notification)}
                    className="text-indigo-600 hover:text-indigo-800 mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicate(notification)}
                    className="text-gray-600 hover:text-gray-800 mr-2"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {filteredNotifications.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No notifications found. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingNotification ? 'Edit Notification' : 'Create Notification'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="ExecutionCompleted">Execution Completed</option>
                  <option value="ExecutionFailed">Execution Failed</option>
                  <option value="ScheduleCompleted">Schedule Completed</option>
                  <option value="ScheduleFailed">Schedule Failed</option>
                  <option value="ReportGenerated">Report Generated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Provider</label>
                <select
                  value={formData.providerId}
                  onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  required
                >
                  <option value="">Select a provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Recipients (comma-separated)</label>
                <input
                  type="text"
                  value={formData.recipients.join(', ')}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="email@example.com, @user"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject Template</label>
                <input
                  type="text"
                  value={formData.subjectTemplate}
                  onChange={(e) => setFormData({ ...formData, subjectTemplate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Test execution {{status}}"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Body Template</label>
                <textarea
                  value={formData.bodyTemplate}
                  onChange={(e) => setFormData({ ...formData, bodyTemplate: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                  rows={4}
                  placeholder="Execution run {{executionRunId}} completed with status: {{status}}"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="enabled" className="text-sm font-medium">Enabled</label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingNotification ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationPage;