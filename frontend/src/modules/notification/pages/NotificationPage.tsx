// NotificationPage - CRUD interface for managing notifications
import React from 'react';
import { useNotifications, useProviders, useNotificationMutations, useNotificationPage } from '../hooks';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { PageEmpty, PageError, PageLoading } from '../../../components/shared/PageState';
import { useParams } from 'react-router-dom';

export function NotificationPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: notifications = [], isLoading: loading, isError, error } = useNotifications(projectId || null);
  const { data: providers = [] } = useProviders(projectId || null);
  const { createNotification, updateNotification, deleteNotification } = useNotificationMutations(projectId || undefined);
  const {
    isModalOpen,
    setIsModalOpen,
    editingNotification,
    deleteOpen,
    setDeleteOpen,
    setDeleteId,
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
  } = useNotificationPage({
    projectId: projectId || null,
    notifications,
    providers,
    createNotification,
    updateNotification,
    deleteNotification,
  });

  if (loading) return <PageLoading title="Loading notifications..." />;
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <PageError
        title="Failed to load notifications"
        message={message}
      />
    );
  }

  const breadcrumbItems = [
    { label: 'Projects', to: '/projects' },
    { label: 'Project', to: `/projects/${projectId}/overview` },
    { label: 'Notifications' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-text-secondary">
          {breadcrumbItems.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              {item.to ? (
                <a href={item.to} className="hover:text-text">{item.label}</a>
              ) : (
                <span className="text-text">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
        <div className="flex justify-between items-center mt-4">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Notification
          </button>
        </div>
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

      {filteredNotifications.length === 0 ? (
        <PageEmpty
          title="No notifications found"
          description="Create one to get started."
        />
      ) : (
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
                      onClick={() => { setDeleteId(notification.id); setDeleteOpen(true); }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title='Delete Notification'
        message={`Deleting this notification cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteId(null); }}
      />

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
