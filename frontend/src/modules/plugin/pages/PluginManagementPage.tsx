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
      'AI': 'bg-primary/15 text-primary',
      'Notification': 'bg-primary/15 text-primary',
      'Provider': 'bg-success/15 text-success',
      'Validation': 'bg-warning/15 text-warning',
      'ReportExport': 'bg-primary/15 text-primary',
      'CICD': 'bg-error/15 text-error',
      'SecretManagement': 'bg-primary/15 text-primary',
      'TestDataGenerator': 'bg-success/15 text-success',
    };
    return colors[category] || 'bg-background text-text-secondary';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-success/15 text-success';
      case 'unhealthy': return 'bg-error/15 text-error';
      default: return 'bg-background text-text-secondary';
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
    <div className="w-full max-w-none p-6">
      <WorkflowOptionalBanner
        description="Extend the platform with optional integrations. Core API testing does not require plugins."
      />
      <AdminPageIntro
        title="Plugins"
        description="Enable, disable, and check health of installed extensions."
      />

      {/* Filters */}
      <div className="bg-surface border border-border shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PluginCategory | '')}
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
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
      <div className="bg-surface border border-border shadow rounded-lg overflow-hidden">
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
            <thead className="bg-background/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Capabilities</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Health</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlugins.map((plugin) => (
                <tr key={plugin.id} className="hover:bg-background">
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
                        <span key={idx} className="px-2 py-0.5 text-xs bg-background text-text-secondary rounded">
                          {cap.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      plugin.enabled
                        ? 'bg-success/15 text-success'
                        : 'bg-background text-text-secondary'
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
                        className="text-xs text-primary hover:text-primary"
                      >
                        Check
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPlugin(plugin)}
                        className="text-primary hover:text-primary"
                      >
                        View
                      </button>
                      {plugin.enabled ? (
                        <button
                          onClick={() => handleDisable(plugin.id)}
                          className="text-warning hover:text-warning"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEnable(plugin.id)}
                          className="text-success hover:text-success"
                        >
                          Enable
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(plugin.id)}
                        className="text-error hover:text-error"
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
          <div className="bg-surface border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedPlugin.name}</h2>
              <button
                onClick={() => setSelectedPlugin(null)}
                className="text-text-secondary hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Plugin ID</label>
                  <div className="text-sm text-text">{selectedPlugin.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Version</label>
                  <div className="text-sm text-text">v{selectedPlugin.version}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Author</label>
                  <div className="text-sm text-text">{selectedPlugin.author}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Category</label>
                  <div className="text-sm text-text">{selectedPlugin.category}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Status</label>
                  <div className="text-sm text-text">{selectedPlugin.enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Created At</label>
                  <div className="text-sm text-text">{formatDate(selectedPlugin.createdAt)}</div>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Capabilities</label>
                <div className="space-y-2">
                  {selectedPlugin.capabilities.map((cap, idx) => (
                    <div key={idx} className="border border-border rounded p-3 bg-background">
                      <div className="font-medium text-sm">{cap.name}</div>
                      <div className="text-xs text-text-secondary">{cap.description}</div>
                      <div className="text-xs text-text-secondary mt-1">Version: {cap.version}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Configuration</label>
                <pre className="bg-background p-4 rounded text-xs overflow-auto max-h-64 border border-border">
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
                  className="px-4 py-2 bg-warning text-white rounded hover:bg-warning/90"
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleEnable(selectedPlugin.id);
                    setSelectedPlugin(null);
                  }}
                  className="px-4 py-2 bg-success text-white rounded hover:bg-success/90"
                >
                  Enable
                </button>
              )}
              <button
                onClick={() => setSelectedPlugin(null)}
                className="px-4 py-2 border border-border rounded hover:bg-background"
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
