// AIProviderManagementPage - Manages AI provider configurations for a project.
// Features: Provider list, cards, default provider, enable/disable, test connection,
// configuration editor, search, filters, model selector, cost estimation preview, health indicator.
import { useState, useMemo } from 'react';
import { useAIProviders, useAIProviderTypes } from '../hooks';
import { aiProviderService } from '../services';
import type { AIProvider, AIProviderType, AIProviderFormData } from '../types';

interface AIProviderManagementPageProps {
  projectId: string;
}

const PROVIDER_COLORS: Record<AIProviderType, string> = {
  'OpenAI': 'bg-emerald-100 text-emerald-800',
  'Claude': 'bg-orange-100 text-orange-800',
  'Gemini': 'bg-blue-100 text-blue-800',
  'Ollama': 'bg-purple-100 text-purple-800',
  'Azure OpenAI': 'bg-cyan-100 text-cyan-800',
  'AWS Bedrock': 'bg-amber-100 text-amber-800',
  'Custom': 'bg-gray-100 text-gray-800',
};

const DEFAULT_MODELS: Record<AIProviderType, string> = {
  'OpenAI': 'gpt-4o',
  'Claude': 'claude-3-5-sonnet-20241022',
  'Gemini': 'gemini-1.5-pro',
  'Ollama': 'llama3.1',
  'Azure OpenAI': 'gpt-4o',
  'AWS Bedrock': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'Custom': 'custom-model',
};

const EMPTY_FORM: AIProviderFormData = {
  name: '',
  provider: 'OpenAI',
  model: 'gpt-4o',
  endpoint: '',
  apiKey: '',
  organization: '',
  temperature: 0.7,
  topP: 1,
  maxTokens: 2048,
  timeout: 30000,
  enabled: true,
  default: false,
};

export function AIProviderManagementPage({ projectId }: AIProviderManagementPageProps) {
  const { providers, loading, error, refetch } = useAIProviders(projectId);
  const { types } = useAIProviderTypes();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<AIProviderType | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AIProviderFormData>(EMPTY_FORM);
  const [healthMap, setHealthMap] = useState<Record<string, { healthy: boolean; message: string }>>({});
  const [estimateMap, setEstimateMap] = useState<Record<string, any>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<{ healthy: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      // Search
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.model.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.provider.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Provider filter
      if (filterProvider && p.provider !== filterProvider) return false;
      // Status filter
      if (filterStatus === 'enabled' && !p.enabled) return false;
      if (filterStatus === 'disabled' && p.enabled) return false;
      return true;
    });
  }, [providers, searchQuery, filterProvider, filterStatus]);

  const handleCreate = async () => {
    try {
      await aiProviderService.createProvider(projectId, {
        name: formData.name,
        provider: formData.provider,
        model: formData.model,
        endpoint: formData.endpoint || undefined,
        apiKey: formData.apiKey || undefined,
        organization: formData.organization || undefined,
        temperature: formData.temperature,
        topP: formData.topP,
        maxTokens: formData.maxTokens,
        timeout: formData.timeout,
        enabled: formData.enabled,
        default: formData.default,
      });
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      refetch();
    } catch (err: any) {
      alert(`Failed to create provider: ${err.message}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProvider) return;
    try {
      await aiProviderService.updateProvider(projectId, selectedProvider.id, {
        name: formData.name,
        provider: formData.provider,
        model: formData.model,
        endpoint: formData.endpoint || undefined,
        apiKey: formData.apiKey || undefined,
        organization: formData.organization || undefined,
        temperature: formData.temperature,
        topP: formData.topP,
        maxTokens: formData.maxTokens,
        timeout: formData.timeout,
        enabled: formData.enabled,
        default: formData.default,
      });
      setIsEditing(false);
      setSelectedProvider(null);
      refetch();
    } catch (err: any) {
      alert(`Failed to update provider: ${err.message}`);
    }
  };

  const handleEnable = async (providerId: string) => {
    try {
      await aiProviderService.enableProvider(projectId, providerId);
      refetch();
    } catch (err: any) {
      alert(`Failed to enable provider: ${err.message}`);
    }
  };

  const handleDisable = async (providerId: string) => {
    try {
      await aiProviderService.disableProvider(projectId, providerId);
      refetch();
    } catch (err: any) {
      alert(`Failed to disable provider: ${err.message}`);
    }
  };

  const handleSetDefault = async (providerId: string) => {
    try {
      await aiProviderService.setDefaultProvider(projectId, providerId);
      refetch();
    } catch (err: any) {
      alert(`Failed to set default provider: ${err.message}`);
    }
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this AI provider?')) return;
    try {
      await aiProviderService.deleteProvider(projectId, providerId);
      refetch();
    } catch (err: any) {
      alert(`Failed to delete provider: ${err.message}`);
    }
  };

  const handleTest = async (providerId: string) => {
    setTestLoading(true);
    setTestResult(null);
    setShowTestModal(true);
    try {
      const result = await aiProviderService.testProvider(projectId, providerId);
      setTestResult(result);
      setHealthMap(prev => ({ ...prev, [providerId]: result }));
    } catch (err: any) {
      setTestResult({ healthy: false, message: err.message || 'Failed to test connection' });
    } finally {
      setTestLoading(false);
    }
  };

  const handleEstimate = async (providerId: string) => {
    try {
      const messages = [
        { role: 'system' as const, content: 'You are a test generation assistant.' },
        { role: 'user' as const, content: 'Generate test cases for the login API endpoint.' },
      ];
      const estimate = await aiProviderService.estimateProvider(projectId, providerId, messages);
      setEstimateMap(prev => ({ ...prev, [providerId]: estimate }));
    } catch (err: any) {
      alert(`Failed to estimate cost: ${err.message}`);
    }
  };

  const openEdit = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setFormData({
      name: provider.name,
      provider: provider.provider,
      model: provider.model,
      endpoint: provider.endpoint || '',
      apiKey: provider.apiKey || '',
      organization: provider.organization || '',
      temperature: provider.temperature,
      topP: provider.topP,
      maxTokens: provider.maxTokens,
      timeout: provider.timeout,
      enabled: provider.enabled,
      default: provider.isDefault,
    });
    setIsEditing(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getProviderColor = (type: AIProviderType) => {
    return PROVIDER_COLORS[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="p-4">Loading AI providers...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {String(error)}</div>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Provider Management</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Configure AI model providers for this project. Placeholder responses only - no external API calls.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData(EMPTY_FORM);
            setShowCreateModal(true);
          }}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Add Provider
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name, model, or provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Provider Type</label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value as AIProviderType | '')}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">All Providers</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      {filteredProviders.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-text-secondary">
          No AI providers found. Click "Add Provider" to configure one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className="rounded-lg border border-border bg-surface p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getProviderColor(provider.provider)}`}>
                    {provider.provider}
                  </span>
                  {provider.isDefault && (
                    <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    provider.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-xs text-text-secondary">
                    {provider.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <h3 className="mt-3 text-lg font-semibold">{provider.name}</h3>
              <p className="text-sm text-text-secondary">Model: {provider.model}</p>

              {/* Health indicator */}
              <div className="mt-3">
                {healthMap[provider.id] ? (
                  <div className={`text-xs font-medium ${
                    healthMap[provider.id].healthy ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {healthMap[provider.id].healthy ? '● Healthy' : '● Unhealthy'}
                  </div>
                ) : (
                  <div className="text-xs text-text-secondary">Health not checked</div>
                )}
              </div>

              {/* Cost estimation preview */}
              <div className="mt-3">
                {estimateMap[provider.id] ? (
                  <div className="rounded bg-background p-2 text-xs">
                    <div className="font-medium">Cost Estimate</div>
                    <div>Tokens: {estimateMap[provider.id].totalTokens}</div>
                    <div>Cost: ${estimateMap[provider.id].totalCost.toFixed(6)}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleEstimate(provider.id)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Estimate cost
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => openEdit(provider)}
                  className="px-3 py-1 text-xs border rounded hover:bg-background"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleTest(provider.id)}
                  className="px-3 py-1 text-xs border rounded hover:bg-background"
                >
                  Test
                </button>
                {provider.enabled ? (
                  <button
                    onClick={() => handleDisable(provider.id)}
                    className="px-3 py-1 text-xs border rounded text-yellow-600 hover:bg-background"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={() => handleEnable(provider.id)}
                    className="px-3 py-1 text-xs border rounded text-green-600 hover:bg-background"
                  >
                    Enable
                  </button>
                )}
                {!provider.isDefault && (
                  <button
                    onClick={() => handleSetDefault(provider.id)}
                    className="px-3 py-1 text-xs border rounded text-blue-600 hover:bg-background"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleDelete(provider.id)}
                  className="px-3 py-1 text-xs border rounded text-red-600 hover:bg-background"
                >
                  Delete
                </button>
              </div>

              <div className="mt-3 text-xs text-text-secondary">
                Updated: {formatDate(provider.updatedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || isEditing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Edit AI Provider' : 'Add AI Provider'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditing(false);
                  setSelectedProvider(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded"
                    placeholder="My OpenAI Provider"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider Type *</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => {
                      const provider = e.target.value as AIProviderType;
                      setFormData({
                        ...formData,
                        provider,
                        model: DEFAULT_MODELS[provider] || formData.model,
                      });
                    }}
                    className="mt-1 w-full px-3 py-2 border rounded"
                  >
                    {types.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Model *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded"
                  placeholder="gpt-4o"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                  <input
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded"
                    placeholder="sk-..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded"
                  placeholder="org-..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Temperature ({formData.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="mt-2 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Top P ({formData.topP})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.topP}
                    onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                    className="mt-2 w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timeout (ms)</label>
                  <input
                    type="number"
                    value={formData.timeout}
                    onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full px-3 py-2 border rounded"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Enabled</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.default}
                    onChange={(e) => setFormData({ ...formData, default: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Set as Default</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditing(false);
                  setSelectedProvider(null);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={isEditing ? handleUpdate : handleCreate}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
              >
                {isEditing ? 'Save Changes' : 'Create Provider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Test Connection</h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {testLoading ? (
              <div className="py-8 text-center text-text-secondary">Testing connection...</div>
            ) : testResult ? (
              <div className={`rounded p-4 ${
                testResult.healthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`font-medium ${
                  testResult.healthy ? 'text-green-700' : 'text-red-700'
                }`}>
                  {testResult.healthy ? '✓ Connection Successful' : '✗ Connection Failed'}
                </div>
                <div className="mt-2 text-sm text-gray-600">{testResult.message}</div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTestModal(false)}
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

export default AIProviderManagementPage;