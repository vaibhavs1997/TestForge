// ProvidersSection - Provider Management UI integrated into Test Data Library
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Plus, Edit, Trash2, Plug, Zap, Power, Star, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { providerService } from '../services/providerService';
import type { Provider, ProviderCategory, ProviderAdapterType, CreateProviderInput, ProviderTestResult, AdapterInfo } from '../types/provider';

const CATEGORIES: ProviderCategory[] = ['Email', 'SMS', 'Payment', 'Storage', 'Custom'];

const CATEGORY_BADGE: Record<ProviderCategory, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  Email: 'default',
  SMS: 'secondary',
  Payment: 'destructive',
  Storage: 'outline',
  Custom: 'secondary',
};

interface ProvidersSectionProps {
  projectId: string;
  setToastMessage: (msg: string) => void;
  setToastOpen: (open: boolean) => void;
}

export const ProvidersSection: React.FC<ProvidersSectionProps> = ({ projectId, setToastMessage, setToastOpen }) => {
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Provider | null>(null);
  const [editingProvider, setEditingProvider] = React.useState<Provider | null>(null);
  const [adapterTypes, setAdapterTypes] = React.useState<AdapterInfo[]>([]);
  const [testResults, setTestResults] = React.useState<Record<string, ProviderTestResult>>({});
  const [testingIds, setTestingIds] = React.useState<Set<string>>(new Set());
  const [toastVisible, setToastVisible] = React.useState(false);
  const [toastMsg, setToastMsg] = React.useState('');

  const loadProviders = React.useCallback(async () => {
    try {
      const data = await providerService.listByProject(projectId);
      setProviders(data);
    } catch (error) {
      setToastMessage('Failed to load providers');
      setToastOpen(true);
    }
  }, [projectId, setToastMessage, setToastOpen]);

  // Load providers on mount
  React.useEffect(() => {
    loadProviders();
    providerService.listAdapterTypes().then(setAdapterTypes).catch(() => {});
  }, [loadProviders]);

  const filteredProviders = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return providers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(term) || p.adapter.toLowerCase().includes(term);
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [search, categoryFilter, providers]);

  const handleSave = async (data: CreateProviderInput) => {
    try {
      if (editingProvider) {
        await providerService.update(projectId, editingProvider.id, data);
        setToastMessage('Provider updated successfully');
      } else {
        await providerService.create(projectId, data);
        setToastMessage('Provider created successfully');
      }
      setToastOpen(true);
      setDialogOpen(false);
      setEditingProvider(null);
      loadProviders();
    } catch (error) {
      setToastMessage('Failed to save provider');
      setToastOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await providerService.delete(projectId, deleteTarget.id);
      setToastMessage('Provider deleted successfully');
      setToastOpen(true);
      setDeleteTarget(null);
      loadProviders();
    } catch (error) {
      setToastMessage('Failed to delete provider');
      setToastOpen(true);
    }
  };

  const handleToggleEnabled = async (provider: Provider) => {
    try {
      await providerService.update(projectId, provider.id, { enabled: !provider.enabled });
      loadProviders();
    } catch (error) {
      setToastMessage('Failed to update provider');
      setToastOpen(true);
    }
  };

  const handleSetDefault = async (provider: Provider) => {
    try {
      await providerService.update(projectId, provider.id, { isDefault: true });
      loadProviders();
      setToastMessage('Default provider set');
      setToastOpen(true);
    } catch (error) {
      setToastMessage('Failed to set default provider');
      setToastOpen(true);
    }
  };

  const handleTestConnection = async (provider: Provider) => {
    setTestingIds(prev => new Set(prev).add(provider.id));
    try {
      const result = await providerService.testConnection(projectId, provider.id);
      setTestResults(prev => ({ ...prev, [provider.id]: result }));
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider.id]: { success: false, message: 'Test failed' } }));
    } finally {
      setTestingIds(prev => {
        const next = new Set(prev);
        next.delete(provider.id);
        return next;
      });
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Providers</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Manage external providers for test data generation. Configure adapters, test connections, and set defaults.
          </p>
        </div>
        <Button onClick={() => { setEditingProvider(null); setDialogOpen(true); }}>
          <Plus className='mr-2 h-4 w-4' />
          New Provider
        </Button>
      </div>

      {/* Search and Filters */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-1 items-center gap-3'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search providers...' className='sm:w-80' />
          <div className='flex gap-2'>
            {['All', ...CATEGORIES].map(cat => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size='sm'
                onClick={() => setCategoryFilter(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Provider Cards */}
      {filteredProviders.length === 0 ? (
        <EmptyState
          icon={<Plug className='h-12 w-12' />}
          title='No providers configured'
          description='Create your first external provider to enable test data generation from external services.'
          action={{ label: 'Add Provider', onClick: () => { setEditingProvider(null); setDialogOpen(true); } }}
        />
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredProviders.map(provider => (
            <Card key={provider.id} className='transition-shadow hover:shadow-lg'>
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2'>
                    <Plug className='h-5 w-5 text-primary' />
                    <div>
                      <CardTitle className='text-base'>{provider.name}</CardTitle>
                      <div className='mt-1 flex gap-1'>
                        <Badge variant={CATEGORY_BADGE[provider.category]} className='text-xs'>{provider.category}</Badge>
                        <Badge variant='outline' className='text-xs'>{provider.adapter}</Badge>
                        {provider.isDefault && <Badge variant='secondary' className='text-xs'>Default</Badge>}
                        {!provider.enabled && <Badge variant='secondary' className='text-xs'>Disabled</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  <div className='flex items-center justify-between text-xs'>
                    <span className='text-text-secondary'>Status</span>
                    <div className='flex items-center gap-2'>
                      {provider.enabled
                        ? <CheckCircle2 className='h-4 w-4 text-green-500' />
                        : <XCircle className='h-4 w-4 text-red-500' />}
                      <span className={provider.enabled ? 'text-green-600' : 'text-red-600'}>
                        {provider.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                  {testResults[provider.id] && (
                    <div className={`rounded-lg p-2 text-xs ${testResults[provider.id].success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {testResults[provider.id].message}
                    </div>
                  )}
                  <div className='flex gap-2 pt-2'>
                    <Button variant='outline' size='sm' className='flex-1' disabled={testingIds.has(provider.id)} onClick={() => handleTestConnection(provider)}>
                      {testingIds.has(provider.id) ? <RefreshCw className='mr-1 h-3 w-3 animate-spin' /> : <Zap className='mr-1 h-3 w-3' />}
                      Test
                    </Button>
                    <Button variant='outline' size='sm' onClick={() => handleToggleEnabled(provider)}>
                      <Power className='h-3 w-3' />
                    </Button>
                    {!provider.isDefault && (
                      <Button variant='ghost' size='sm' onClick={() => handleSetDefault(provider)}>
                        <Star className='h-3 w-3' />
                      </Button>
                    )}
                    <Button variant='ghost' size='sm' onClick={() => { setEditingProvider(provider); setDialogOpen(true); }}>
                      <Edit className='h-3 w-3' />
                    </Button>
                    <Button variant='ghost' size='sm' onClick={() => setDeleteTarget(provider)}>
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {dialogOpen && (
        <ProviderDialog
          open={dialogOpen}
          provider={editingProvider}
          adapterTypes={adapterTypes}
          onClose={() => { setDialogOpen(false); setEditingProvider(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title='Delete Provider'
        message={`Deleting "${deleteTarget?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

// ─── Provider Dialog Component ──────────────────────────────────────────
interface ProviderDialogProps {
  open: boolean;
  provider: Provider | null;
  adapterTypes: AdapterInfo[];
  onClose: () => void;
  onSave: (data: CreateProviderInput) => void;
}

const ProviderDialog: React.FC<ProviderDialogProps> = ({ open, provider, adapterTypes, onClose, onSave }) => {
  const [name, setName] = React.useState(provider?.name || '');
  const [category, setCategory] = React.useState<ProviderCategory>(provider?.category || 'Email');
  const [adapter, setAdapter] = React.useState<ProviderAdapterType>(provider?.adapter || 'Mailtrap');
  const [enabled, setEnabled] = React.useState(provider?.enabled ?? true);
  const [isDefault, setIsDefault] = React.useState(provider?.isDefault ?? false);
  const [credentials, setCredentials] = React.useState<Record<string, string>>(
    Object.entries(provider?.credentials || {}).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
  );
  const [configKeys, setConfigKeys] = React.useState<string[]>(Object.keys(provider?.configuration || {}));
  const [configValues, setConfigValues] = React.useState<Record<string, string>>(
    Object.entries(provider?.configuration || {}).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
  );

  React.useEffect(() => {
    if (open) {
      setName(provider?.name || '');
      setCategory(provider?.category || 'Email');
      setAdapter(provider?.adapter || 'Mailtrap');
      setEnabled(provider?.enabled ?? true);
      setIsDefault(provider?.isDefault ?? false);
      setCredentials(Object.entries(provider?.credentials || {}).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}));
      setConfigKeys(Object.keys(provider?.configuration || {}));
      setConfigValues(Object.entries(provider?.configuration || {}).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {}));
    }
  }, [open, provider]);

  if (!open) return null;

  const handleSubmit = () => {
    const configuration: Record<string, any> = {};
    configKeys.forEach((key, idx) => {
      if (key.trim()) configuration[key.trim()] = configValues[key] || '';
    });
    // Only include non-empty credentials
    const cleanCredentials: Record<string, any> = {};
    Object.entries(credentials).forEach(([key, value]) => {
      if (key && value) cleanCredentials[key] = value;
    });
    onSave({
      name,
      category,
      adapter,
      configuration,
      credentials: cleanCredentials,
      enabled,
      isDefault,
    });
  };

  return (
    <div className='app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <Card className='app-modal-panel w-full max-w-2xl'>
        <CardHeader>
          <CardTitle>{provider ? 'Edit Provider' : 'Add Provider'}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='mb-1 block text-xs font-medium text-text-secondary'>Name</label>
              <input
                type='text'
                value={name}
                onChange={e => setName(e.target.value)}
                className='w-full rounded-lg border border-border px-3 py-2 text-sm'
                placeholder='e.g. Mailtrap Sandbox'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-text-secondary'>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ProviderCategory)}
                className='w-full rounded-lg border border-border px-3 py-2 text-sm'
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className='mb-1 block text-xs font-medium text-text-secondary'>Adapter</label>
              <select
                value={adapter}
                onChange={e => setAdapter(e.target.value as ProviderAdapterType)}
                className='w-full rounded-lg border border-border px-3 py-2 text-sm'
              >
                {['Mailtrap', 'MailHog', 'TempMail', 'Twilio', 'StripeSandbox', 'Custom'].map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className='flex items-end gap-4 pb-1'>
              <label className='flex items-center gap-2 text-sm text-text'>
                <input type='checkbox' checked={enabled} onChange={e => setEnabled(e.target.checked)} className='h-4 w-4' />
                Enabled
              </label>
              <label className='flex items-center gap-2 text-sm text-text'>
                <input type='checkbox' checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className='h-4 w-4' />
                Default
              </label>
            </div>
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-text-secondary'>Credentials</label>
            {Object.entries(credentials).map(([key, value]) => (
              <div key={key} className='mb-2 flex items-center gap-2'>
                <input
                  type='text'
                  value={key}
                  onChange={e => {
                    const next = { ...credentials };
                    delete next[key];
                    if (e.target.value) next[e.target.value] = value;
                    setCredentials(next);
                  }}
                  className='w-40 rounded-lg border border-border px-3 py-1.5 text-xs font-mono'
                  placeholder='Key'
                />
                <input
                  type='password'
                  value={value}
                  onChange={e => setCredentials({ ...credentials, [key]: e.target.value })}
                  className='flex-1 rounded-lg border border-border px-3 py-1.5 text-xs'
                  placeholder='Value'
                />
                <Button variant='ghost' size='sm' onClick={() => { const next = { ...credentials }; delete next[key]; setCredentials(next); }}>
                  ✕
                </Button>
              </div>
            ))}
            <Button
              variant='outline'
              size='sm'
              onClick={() => setCredentials({ ...credentials, apiKey: '' })}
            >
              + Add Credential
            </Button>
          </div>

          <div>
            <label className='mb-1 block text-xs font-medium text-text-secondary'>Configuration</label>
            {configKeys.map((key) => (
              <div key={key} className='mb-2 flex items-center gap-2'>
                <input
                  type='text'
                  value={key}
                  onChange={e => {
                    const nextKeys = configKeys.map(k => k === key ? e.target.value : k);
                    setConfigKeys(nextKeys);
                    setConfigValues({ ...configValues, [e.target.value]: configValues[key] });
                  }}
                  className='w-40 rounded-lg border border-border px-3 py-1.5 text-xs font-mono'
                  placeholder='Config key'
                />
                <input
                  type='text'
                  value={configValues[key] || ''}
                  onChange={e => setConfigValues({ ...configValues, [key]: e.target.value })}
                  className='flex-1 rounded-lg border border-border px-3 py-1.5 text-xs'
                  placeholder='Value'
                />
                <Button variant='ghost' size='sm' onClick={() => {
                  const nextKeys = configKeys.filter(k => k !== key);
                  const nextValues = { ...configValues };
                  delete nextValues[key];
                  setConfigKeys(nextKeys);
                  setConfigValues(nextValues);
                }}>
                  ✕
                </Button>
              </div>
            ))}
            <Button variant='outline' size='sm' onClick={() => {
              const newKey = `config_${configKeys.length + 1}`;
              setConfigKeys([...configKeys, newKey]);
              setConfigValues({ ...configValues, [newKey]: '' });
            }}>
              + Add Config
            </Button>
          </div>
        </CardContent>
        <CardFooter className='flex justify-between'>
          <Button variant='outline' onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>{provider ? 'Update' : 'Create'}</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ProvidersSection;
