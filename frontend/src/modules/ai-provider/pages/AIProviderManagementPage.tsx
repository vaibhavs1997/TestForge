// AIProviderManagementPage - Manages AI provider configurations for a project.
// Features: Provider list, cards, default provider, enable/disable, test connection,
// configuration editor, search, filters, model selector, cost estimation preview, health indicator.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAIProviders, useAIProviderTypes } from '../hooks';
import { aiProviderService } from '../services';
import type { AIProvider, AIProviderType, AIProviderFormData } from '../types';
import { getApiErrorMessage } from '../../../services/apiHelpers';

interface AIProviderManagementPageProps {
  projectId: string;
}

const PROVIDER_COLORS: Record<AIProviderType, string> = {
  'OpenAI': 'bg-emerald-100 text-emerald-800',
  'Groq': 'bg-orange-100 text-orange-800',
  'Claude': 'bg-orange-100 text-orange-800',
  'Gemini': 'bg-blue-100 text-blue-800',
  'Ollama': 'bg-purple-100 text-purple-800',
  'Azure OpenAI': 'bg-cyan-100 text-cyan-800',
  'AWS Bedrock': 'bg-amber-100 text-amber-800',
  'Custom': 'bg-gray-100 text-gray-800',
};

const DEFAULT_MODELS: Record<AIProviderType, string> = {
  'OpenAI': 'gpt-4o',
  'Groq': 'llama-3.3-70b-versatile',
  'Claude': 'claude-3-5-sonnet-20241022',
  'Gemini': 'gemini-1.5-pro',
  'Ollama': 'llama3.2',
  'Azure OpenAI': 'gpt-4o',
  'AWS Bedrock': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  'Custom': 'custom-model',
};

const DEFAULT_ENDPOINTS: Partial<Record<AIProviderType, string>> = {
  Groq: 'https://api.groq.com/openai/v1',
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

interface FilterSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  ariaLabel: string;
}

function FilterSelect({ value, options, onChange, ariaLabel }: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-left text-sm text-text outline-none transition-colors hover:border-primary/60 focus:border-primary"
      >
        <span>{selectedOption?.label}</span>
        <span className={`ml-3 text-xs text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">v</span>
      </button>
      {open && (
        <div className="theme-select-menu absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-background p-1 shadow-xl">
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`theme-select-option block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                option.value === value
                  ? 'bg-primary/15 text-primary'
                  : 'text-text hover:bg-surface'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AIProvider | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const validateForm = (allowBlankApiKey = false): string | null => {
    if (!formData.name.trim()) return 'Provider name is required.';
    if (!formData.model.trim()) return 'Model is required.';

    if (formData.endpoint.trim()) {
      try {
        const endpoint = new URL(formData.endpoint.trim());
        if (!['http:', 'https:'].includes(endpoint.protocol)) {
          return 'Endpoint must be an HTTP(S) URL, for example https://api.groq.com/openai/v1.';
        }
      } catch {
        return 'Endpoint must be an HTTP(S) URL, for example https://api.groq.com/openai/v1.';
      }
    }

    if (!allowBlankApiKey && ['OpenAI', 'Groq'].includes(formData.provider) && !formData.apiKey.trim()) {
      return `API key is required for ${formData.provider}.`;
    }

    if (formData.maxTokens <= 0) return 'Max tokens must be greater than zero.';
    if (formData.timeout <= 0) return 'Timeout must be greater than zero.';
    return null;
  };

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
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setFormSaving(true);
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
      setFormError(getApiErrorMessage(err, 'Failed to create provider.'));
    } finally {
      setFormSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProvider) return;
    const validationError = validateForm(true);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setFormSaving(true);
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
      setFormError(getApiErrorMessage(err, 'Failed to update provider.'));
    } finally {
      setFormSaving(false);
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

  const handleDelete = (provider: AIProvider) => {
    setDeleteError('');
    setDeleteTarget(provider);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await aiProviderService.deleteProvider(projectId, deleteTarget.id);
      setDeleteTarget(null);
      await refetch();
    } catch (err: any) {
      setDeleteError(getApiErrorMessage(err, 'Failed to delete provider.'));
    } finally {
      setDeleteLoading(false);
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
      apiKey: '',
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
    <div className="w-full px-4 py-6 lg:px-8">
      {/* Filters */}
      <div className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Search</label>
            <input
              type="text"
              placeholder="Search by name, model, or provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background/80 px-3 text-sm text-text placeholder:text-text-secondary outline-none transition-colors focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Provider Type</label>
            <FilterSelect
              value={filterProvider}
              onChange={(value) => setFilterProvider(value as AIProviderType | '')}
              ariaLabel="Filter by provider type"
              options={[
                { value: '', label: 'All Providers' },
                ...types.map(type => ({ value: type, label: type })),
              ]}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text">Status</label>
            <FilterSelect
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as 'all' | 'enabled' | 'disabled')}
              ariaLabel="Filter by status"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'enabled', label: 'Enabled' },
                { value: 'disabled', label: 'Disabled' },
              ]}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setFormData(EMPTY_FORM);
              setFormError('');
              setShowCreateModal(true);
            }}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Add provider
          </button>
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
                  {provider.capability && <span className={`px-2 py-1 text-xs font-medium rounded ${provider.capability === 'SIMULATED' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>{provider.capability === 'SIMULATED' ? 'Simulated — not production AI' : provider.capability}</span>}
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
              {provider.status && <p className={`mt-1 text-xs ${provider.status === 'UNREACHABLE' ? 'text-red-600' : provider.status === 'SIMULATED' ? 'text-amber-700' : 'text-text-secondary'}`}>Status: {provider.status}</p>}

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
                  onClick={() => handleDelete(provider)}
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
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="app-modal-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border p-6 text-text shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text">
                {isEditing ? 'Edit AI Provider' : 'Add AI Provider'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditing(false);
                  setSelectedProvider(null);
                  setFormError('');
                }}
                className="text-text-secondary hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    placeholder="My OpenAI Provider"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text">Provider Type *</label>
                  <select
                    value={formData.provider}
                    onChange={(e) => {
                      const provider = e.target.value as AIProviderType;
                    setFormData({
                      ...formData,
                      provider,
                      model: DEFAULT_MODELS[provider] || formData.model,
                      endpoint: formData.endpoint || DEFAULT_ENDPOINTS[provider] || '',
                    });
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text focus:border-primary focus:outline-none"
                  >
                    {types.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Model *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-secondary focus:border-primary focus:outline-none"
                  placeholder="gpt-4o"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text">Endpoint</label>
                  <input
                    type="text"
                    value={formData.endpoint}
                    onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="mt-1 text-xs text-text-secondary">
                    Optional for OpenAI and Groq. Leave blank to use the provider default.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text">
                    API Key{['OpenAI', 'Groq'].includes(formData.provider) ? ' *' : ''}
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-secondary focus:border-primary focus:outline-none"
                    placeholder={isEditing ? 'Leave blank to keep the existing key' : 'sk-...'}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text placeholder:text-text-secondary focus:border-primary focus:outline-none"
                  placeholder="org-..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text">
                    Temperature ({formData.temperature})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                    className="mt-2 w-full accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text">
                    Top P ({formData.topP})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.topP}
                    onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                    className="mt-2 w-full accent-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text">Max Tokens</label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text">Timeout (ms)</label>
                  <input
                    type="number"
                    value={formData.timeout}
                    onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-text focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-text">Enabled</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.default}
                    onChange={(e) => setFormData({ ...formData, default: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm text-text">Set as Default</span>
                </label>
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
                {formError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setIsEditing(false);
                  setSelectedProvider(null);
                  setFormError('');
                }}
                disabled={formSaving}
                className="rounded-lg border border-border px-4 py-2 text-text hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={isEditing ? handleUpdate : handleCreate}
                disabled={formSaving}
                className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {formSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Provider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-provider-title"
            className="app-modal-panel w-full max-w-md rounded-2xl border border-border p-6 text-text shadow-2xl"
          >
            <h2 id="delete-provider-title" className="text-lg font-semibold text-text">
              Delete AI provider?
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              This will permanently remove <span className="font-medium text-text">{deleteTarget.name}</span> from this project.
            </p>

            {deleteError && (
              <div className="mt-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error" role="alert">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-text hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting...' : 'Delete provider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection Modal */}
      {showTestModal && (
        <div className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="app-modal-panel w-full max-w-md rounded-2xl border border-border p-6 text-text shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text">Test Connection</h2>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-text-secondary hover:text-text"
              >
                ✕
              </button>
            </div>

            {testLoading ? (
              <div className="py-8 text-center text-text-secondary">Testing connection...</div>
            ) : testResult ? (
              <div className={`rounded p-4 ${
                testResult.healthy ? 'bg-success/10 border border-success/30' : 'bg-error/10 border border-error/30'
              }`}>
                <div className={`font-medium ${
                  testResult.healthy ? 'text-success' : 'text-error'
                }`}>
                  {testResult.healthy ? '✓ Connection Successful' : '✗ Connection Failed'}
                </div>
                <div className="mt-2 text-sm text-text-secondary">{testResult.message}</div>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTestModal(false)}
                className="rounded-lg border border-border px-4 py-2 text-text hover:bg-background"
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
