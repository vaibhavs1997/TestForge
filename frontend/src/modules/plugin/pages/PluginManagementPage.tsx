// PluginManagementPage - Displays and manages installed plugins
import { useState, useEffect } from 'react';
import { usePlugins, usePluginHealth } from '../hooks';
import { pluginService } from '../services';
import type { Plugin, PluginCategory } from '../types';
import { AdminPageIntro } from '../../../components/shared/AdminPageIntro';
import { WorkflowOptionalBanner } from '../../../components/shared/WorkflowOptionalBanner';
import { PageEmpty, PageError, PageLoading } from '../../../components/shared/PageState';

export function PluginManagementPage() {
  const { plugins, loading, error, refetch } = usePlugins();
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | ''>('');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, { status: string; message: string }>>({});

  const filteredPlugins = selectedCategory
    ? plugins.filter(p => p.category === selectedCategory)
    : plugins;

  const handleEnable = async (pluginId: string) => {
    try {
      await pluginService.enablePlugin(pluginId);
      refetch();
    } catch (err) {
      console.error('Failed to enable plugin:', err);
    }
  };

  const handleDisable = async (pluginId: string) => {
    try {
      await pluginService.disablePlugin(pluginId);
      refetch();
    } catch (err) {
      console.error('Failed to disable plugin:', err);
    }
  };

  const handleCheckHealth = async (pluginId: string) => {
    try {
      const health = await pluginService.checkHealth(pluginId);
      setHealthMap(prev => ({ ...prev, [pluginId]: health }));
    } catch (err) {
      setHealthMap(prev => ({ ...prev, [pluginId]: { status: 'unhealthy', message: 'Failed to check health' } }));
    }
  };

  const handleDelete = async (pluginId: string) => {
    if (!confirm('Are you sure you want to delete this plugin?')) return;
    try {
      await pluginService.deletePlugin(pluginId);
      refetch();
    } catch (err) {
      console.error('Failed to delete plugin:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getCategoryColor = (category: PluginCategory) => {
    const colors: Record<PluginCategory, string> = {
      'AI': 'bg-purple-100 text-purple-800',
      'Notification': 'bg-blue-100 text-blue-800',
      'Provider': 'bg-green-100 text-green-800',
      'Validation': 'bg-yellow-100 text-yellow-800',
      'ReportExport': 'bg-indigo-100 text-indigo-800',
      'CICD': 'bg-red-100 text-red-800',
      'SecretManagement': 'bg-pink-100 text-pink-800',
      'TestDataGenerator': 'bg-teal-100 text-teal-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'unhealthy': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <PageLoading title="Loading plugins..." />;
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <PageError
        title="Failed to load plugins"
        message={message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <WorkflowOptionalBanner
        description="Extend the platform with optional integrations. Core API testing does not require plugins."
      />
      <AdminPageIntro
        title="Plugins"
        description="Enable, disable, and check health of installed extensions."
      />

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PluginCategory | '')}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All Categories</option>
              <option value="AI">AI</option>
              <option value="Notification">Notification</option>
              <option value="Provider">Provider</option>
              <option value="Validation">Validation</option>
              <option value="ReportExport">Report Export</option>
              <option value="CICD">CI/CD</option>
              <option value="SecretManagement">Secret Management</option>
              <option value="TestDataGenerator">Test Data Generator</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plugins Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Installed Plugins ({filteredPlugins.length})</h2>
        </div>

        {filteredPlugins.length === 0 ? (
          <PageEmpty
            title="No plugins found"
            description="Built-in plugins are loaded on server startup."
          />
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capabilities</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlugins.map((plugin) => (
                <tr key={plugin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {plugin.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    v{plugin.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(plugin.category)}`}>
                      {plugin.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {plugin.author}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {plugin.capabilities.map((cap, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                          {cap.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      plugin.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {plugin.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {healthMap[plugin.id] ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getHealthColor(healthMap[plugin.id].status)}`}>
                        {healthMap[plugin.id].status}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCheckHealth(plugin.id)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Check
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPlugin(plugin)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                      {plugin.enabled ? (
                        <button
                          onClick={() => handleDisable(plugin.id)}
                          className="text-yellow-600 hover:text-yellow-800"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(plugin.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Enable
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(plugin.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Plugin Detail Modal */}
      {selectedPlugin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedPlugin.name}</h2>
              <button
                onClick={() => setSelectedPlugin(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plugin ID</label>
                  <div className="text-sm text-gray-900">{selectedPlugin.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <div className="text-sm text-gray-900">v{selectedPlugin.version}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Author</label>
                  <div className="text-sm text-gray-900">{selectedPlugin.author}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <div className="text-sm text-gray-900">{selectedPlugin.category}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="text-sm text-gray-900">{selectedPlugin.enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <div className="text-sm text-gray-900">{formatDate(selectedPlugin.createdAt)}</div>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capabilities</label>
                <div className="space-y-2">
                  {selectedPlugin.capabilities.map((cap, idx) => (
                    <div key={idx} className="border rounded p-3 bg-gray-50">
                      <div className="font-medium text-sm">{cap.name}</div>
                      <div className="text-xs text-gray-600">{cap.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Version: {cap.version}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Configuration</label>
                <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64 border border-gray-200">
                  {JSON.stringify(selectedPlugin.configuration, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              {selectedPlugin.enabled ? (
                <button
                  onClick={() => {
                    handleDisable(selectedPlugin.id);
                    setSelectedPlugin(null);
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleEnable(selectedPlugin.id);
                    setSelectedPlugin(null);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Enable
                </button>
              )}
              <button
                onClick={() => setSelectedPlugin(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PluginManagementPage;
