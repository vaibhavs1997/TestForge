import React from 'react';
import { apiAxios } from '../../../services/apiAxios';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

type Tab = 'all' | 'DYNAMIC' | 'STATIC' | 'DATASET' | 'ENVIRONMENT' | 'SECRET' | 'LINKED' | 'RUNTIME' | 'attention' | 'datasets' | 'rules' | 'review' | 'runtime';
const tabs: Array<[Tab, string]> = [['all', 'All'], ['DYNAMIC', 'Dynamic'], ['STATIC', 'Static'], ['DATASET', 'Dataset'], ['ENVIRONMENT', 'Environment'], ['SECRET', 'Secret'], ['LINKED', 'Linked'], ['RUNTIME', 'Runtime'], ['attention', 'Needs Attention'], ['datasets', 'Datasets']];
const emptySummary = { totalInputs: 0, ready: 0, existingRulesReused: 0, runtimeLinkSuggestions: 0, optionalAutoHandled: 0, reviewRequired: 0, unresolved: 0 };

export function userFacingStrategy(strategy?: string, optionalPolicy?: string): string {
  if (optionalPolicy === 'OMIT') return 'Do not send';
  return ({ GENERATE: 'Generate automatically', FIXED: 'Fixed value', REUSE: 'Reuse existing value', LINKED_RESPONSE: 'From previous API', DATASET: 'From dataset', ENVIRONMENT: 'From environment', SECRET: 'Secure value', MANUAL: 'Fixed value', CONTRACT_DEFAULT: 'Use contract default' } as Record<string, string>)[strategy || ''] || 'Needs configuration';
}
export function userFacingScope(scope?: string): string {
  return ({ EACH_REQUEST: 'Changes for every request', EACH_EXECUTION: 'Stays the same for one execution', SUITE_RUN: 'Stays the same for this suite run', TEST_CASE: 'Stays with this test case', ENVIRONMENT: 'Stays for this environment', PROJECT: 'Shared project fallback', UNTIL_CHANGED: 'Stays until you change it' } as Record<string, string>)[scope || ''] || 'Uses the default timing';
}
export function runtimeFlow(item: any): string {
  const producer = item.sourceReference?.operationLabel || item.sourceReference?.operationId || item.sourceReference?.field || 'An earlier operation';
  const consumer = `${item.input?.operationLabel || item.input?.operationId || 'Operation'} → ${item.input?.path || 'input'}`;
  return `${producer} → ${consumer}`;
}
export const sourceLabel = (rule: any) => {
  if (rule.optionalFieldPolicy === 'OMIT') return 'Omit optional field';
  if (rule.valueStrategy === 'GENERATE') return `Generate ${rule.semanticType || 'value'}`;
  if (rule.valueStrategy === 'CONTRACT_DEFAULT') return 'Use default value';
  if (rule.valueStrategy === 'SECRET' || rule.sourceReference?.type === 'environment-secret') return 'Use environment secret';
  if (rule.valueStrategy === 'ENVIRONMENT') return 'Use environment value';
  if (rule.valueStrategy === 'DATASET') return 'Use dataset';
  if (rule.valueStrategy === 'LINKED_RESPONSE') return 'Use previous API response';
  if (rule.valueStrategy === 'FIXED' || rule.valueStrategy === 'MANUAL') return 'Use configured value';
  return 'Needs a source';
};
export const operationLabel = (rule: any) => rule.input?.operationLabel || `${rule.input?.operationId || 'Unknown operation'}`;
export const locationLabel = (location?: string) => String(location || 'body').toLowerCase();
export const statusLabel = (rule: any) => {
  if (rule.valueStrategy === 'LINKED_RESPONSE' && rule.status === 'ACCEPTED') return 'LINKED';
  if (rule.status === 'ACCEPTED') return 'READY';
  if (rule.status === 'UNRESOLVED') return 'UNRESOLVED';
  return 'NEEDS_REVIEW';
};
export const strategyLabel = (rule: any) => ({ GENERATE: 'Dynamic', FIXED: 'Static', MANUAL: 'Static', CONTRACT_DEFAULT: 'Static', DATASET: 'Dataset', ENVIRONMENT: 'Environment', SECRET: 'Secret', LINKED_RESPONSE: 'Linked', REUSE: 'Runtime' } as Record<string, string>)[rule?.valueStrategy] || 'Needs Attention';
export const configurationSummary = (rule: any) => {
  const source = rule?.sourceReference || {};
  if (rule?.valueStrategy === 'GENERATE') return `${rule.semanticType || source.generator || 'value'} · ${(rule.changeScope || 'EACH_EXECUTION').replaceAll('_', ' ').toLowerCase()}`;
  if (rule?.valueStrategy === 'DATASET') return `${source.datasetName || source.datasetId || 'Missing dataset'} · ${source.field || 'Missing column'}`;
  if (rule?.valueStrategy === 'ENVIRONMENT') return `${source.environmentName || source.environmentId || 'Missing environment'} · ${source.field || 'Missing variable'}`;
  if (rule?.valueStrategy === 'SECRET') return source.secretName || source.secretRef ? 'Configured secret reference' : 'Missing secret reference';
  if (rule?.valueStrategy === 'LINKED_RESPONSE') return `${source.operationLabel || source.operationId || 'Missing source'} → ${source.field || '$.id'}`;
  if (rule?.valueStrategy === 'REUSE') return source.variableName || source.variableId || 'Runtime variable';
  if (rule?.valueStrategy === 'FIXED' || rule?.valueStrategy === 'MANUAL' || rule?.valueStrategy === 'CONTRACT_DEFAULT') return source.value === undefined ? 'Missing static value' : source.masked ? 'Sensitive value (masked)' : String(source.value);
  return 'No value strategy configured';
};
export const attentionReason = (rule: any) => {
  if (rule?.status === 'UNRESOLVED') return rule.reviewMetadata?.reason || 'No safe value source was found.';
  if (rule?.status !== 'ACCEPTED') return rule.reviewMetadata?.reason || 'This rule needs review.';
  if (rule?.valueStrategy === 'DATASET' && (!rule.sourceReference?.datasetId || !rule.sourceReference?.field)) return 'Dataset or column is missing.';
  if (rule?.valueStrategy === 'ENVIRONMENT' && (!rule.sourceReference?.environmentId || !rule.sourceReference?.field)) return 'Environment variable is missing.';
  if (rule?.valueStrategy === 'SECRET' && !rule.sourceReference?.secretRef) return 'Secret reference is missing.';
  if (rule?.valueStrategy === 'LINKED_RESPONSE' && !rule.sourceReference?.operationId) return 'Linked source is unavailable.';
  return '';
};
export const needsAttention = (rule: any) => Boolean(attentionReason(rule));

/** Presentation-only canonical-rule workspace; inference and resolution remain server-side. */
export const ExecutionDataWorkspace: React.FC<{ projectId: string; onDatasets: () => void; onViewChange: (view: 'primary' | 'datasets') => void; refreshToken?: number }> = ({ projectId, onDatasets, onViewChange, refreshToken = 0 }) => {
  const [tab, setTab] = React.useState<Tab>('all');
  const [rules, setRules] = React.useState<any[]>([]);
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(emptySummary);
  const [selected, setSelected] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [reanalyzeMessage, setReanalyzeMessage] = React.useState('');
  const [clearBusy, setClearBusy] = React.useState(false);
  const load = React.useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [ruleResponse, analysisResponse] = await Promise.all([apiAxios.get(`/api/projects/${projectId}/field-data-rules`), apiAxios.get(`/api/projects/${projectId}/field-data-analysis`)]);
      setRules(ruleResponse.data.data || []);
      const analysis = analysisResponse.data.data || {};
      setSuggestions(analysis.suggestions || []);
      setSummary({ ...emptySummary, ...(analysis.summary || {}) });
    } catch { setRules([]); setSuggestions([]); setSummary(emptySummary); setError('Test data could not be loaded. Try again.'); }
    finally { setLoading(false); }
  }, [projectId]);
  React.useEffect(() => { void load(); }, [load, refreshToken]);
  const accept = async (suggestion: any) => { await apiAxios.post(`/api/projects/${projectId}/field-data-rules/${suggestion.id}/accept`); await load(); };
  const acceptOptionalSuggestions = async () => { const optional = rules.filter((rule) => rule.status !== 'ACCEPTED' && rule.status !== 'UNRESOLVED' && rule.optionalFieldPolicy === 'OMIT'); await Promise.all(optional.map((rule) => apiAxios.post(`/api/projects/${projectId}/field-data-rules/${rule.id}/accept`))); await load(); };
  const reanalyze = async () => { setReanalyzeMessage('Analyzing the current contract…'); try { const response = await apiAxios.post(`/api/projects/${projectId}/field-data-analysis/reanalyze`); const result = response.data.data || {}; setReanalyzeMessage(`${result.newInputs || 0} new inputs and ${result.reviewRequiredChanges || 0} changes need attention.`); await load(); } catch { setReanalyzeMessage('Analysis could not be completed.'); } };
  const clearRules = async () => {
    if (rules.length === 0 || !window.confirm('Delete all analyzed Field Data rules for this project? Reusable datasets will not be deleted.')) return;
    setClearBusy(true); setError('');
    try { const response = await apiAxios.delete(`/api/projects/${projectId}/field-data-rules`); const deleted = response.data.data?.deleted || 0; setReanalyzeMessage(`${deleted} Field Data rule${deleted === 1 ? '' : 's'} deleted.`); setSelected(null); await load(); }
    catch { setError('Field Data rules could not be deleted.'); }
    finally { setClearBusy(false); }
  };
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [editStrategy, setEditStrategy] = React.useState('');
  const [editScope, setEditScope] = React.useState('EACH_EXECUTION');
  const [editGenerator, setEditGenerator] = React.useState('');
  const [editValue, setEditValue] = React.useState('');
  const [editReference, setEditReference] = React.useState<Record<string, string>>({});
  const [catalogs, setCatalogs] = React.useState<any>({ datasets: [], environments: [], variables: [], operations: [] });
  const [editMessage, setEditMessage] = React.useState('');
  const [bulkMode, setBulkMode] = React.useState<'ENVIRONMENT' | 'DATASET' | null>(null);
  const [bulkEnvironmentId, setBulkEnvironmentId] = React.useState('');
  const [bulkDatasetId, setBulkDatasetId] = React.useState('');
  const [bulkMappings, setBulkMappings] = React.useState<Record<string, string>>({});
  const [bulkColumns, setBulkColumns] = React.useState<any[]>([]);
  const [bulkReplaceAccepted, setBulkReplaceAccepted] = React.useState(false);
  React.useEffect(() => {
    if (!selected) return;
    setEditStrategy(strategyLabel(selected).toUpperCase());
    setEditScope(selected.changeScope || 'EACH_EXECUTION');
    setEditGenerator(selected.sourceReference?.generator || selected.semanticType || '');
    setEditValue(selected.sourceReference?.masked ? '' : selected.sourceReference?.value == null ? '' : String(selected.sourceReference.value));
    setEditReference({ datasetId: selected.sourceReference?.datasetId || '', field: selected.sourceReference?.field || '', environmentId: selected.sourceReference?.environmentId || '', secretRef: selected.sourceReference?.secretRef || '', operationId: selected.sourceReference?.operationId || '', responsePath: selected.sourceReference?.field || '$.id', variableId: selected.sourceReference?.variableId || selected.sourceReference?.field || '' });
  }, [selected]);
  React.useEffect(() => {
    let cancelled = false;
    void Promise.all([
      apiAxios.get(`/api/projects/${projectId}/test-data/datasets`).catch(() => ({ data: { data: [] } })),
      apiAxios.get(`/api/projects/${projectId}/environments`).catch(() => ({ data: { data: [] } })),
      apiAxios.get(`/api/projects/${projectId}/knowledge/variables`).catch(() => ({ data: { data: [] } })),
      apiAxios.get(`/api/projects/${projectId}/apis`).catch(() => ({ data: { data: [] } })),
    ]).then(([datasets, environments, variables, operations]) => { if (!cancelled) setCatalogs({ datasets: datasets.data.data || [], environments: environments.data.data || [], variables: variables.data.data || [], operations: operations.data.data || [] }); });
    return () => { cancelled = true; };
  }, [projectId]);
  const columnsForDataset = async (datasetId: string) => { try { const response = await apiAxios.get(`/api/projects/${projectId}/test-data/columns`, { params: { datasetId } }); return response.data.data || []; } catch { return []; } };
  React.useEffect(() => {
    if (bulkMode !== 'DATASET' || !bulkDatasetId) { setBulkColumns([]); return; }
    void apiAxios.get(`/api/projects/${projectId}/test-data/columns`, { params: { datasetId: bulkDatasetId } }).then((response) => setBulkColumns(response.data.data || [])).catch(() => setBulkColumns([]));
  }, [bulkMode, bulkDatasetId, projectId]);
  const saveSelectedRule = async () => {
    if (!selected) return;
    const strategyMap: Record<string, string> = { DYNAMIC: 'GENERATE', STATIC: 'FIXED', DATASET: 'DATASET', ENVIRONMENT: 'ENVIRONMENT', SECRET: 'SECRET', LINKED: 'LINKED_RESPONSE', RUNTIME: 'REUSE' };
    const sourceReference = editStrategy === 'DYNAMIC' ? { type: 'generator', generator: editGenerator } : editStrategy === 'STATIC' ? { type: 'static', value: editValue } : editStrategy === 'DATASET' ? { type: 'dataset', datasetId: editReference.datasetId, field: editReference.field } : editStrategy === 'ENVIRONMENT' ? { type: 'environment', environmentId: editReference.environmentId, field: editReference.field } : editStrategy === 'SECRET' ? { type: 'secret', secretRef: editReference.secretRef } : editStrategy === 'LINKED' ? { type: 'producer', operationId: editReference.operationId, field: editReference.responsePath } : { type: 'runtime', variableId: editReference.variableId, field: editReference.variableId };
    if (editStrategy === 'STATIC' && selected.sourceReference?.masked && !editValue) { setEditMessage('Existing sensitive value preserved. Enter a new value only to replace it.'); }
    try {
      if (editStrategy === 'STATIC' && selected.sourceReference?.masked && editValue) {
        await apiAxios.post(`/api/projects/${projectId}/field-data-rules/secure-static`, { ruleId: selected.id, input: selected.input, semanticType: selected.semanticType, required: selected.required, changeScope: editScope, value: editValue });
      } else {
        const preservedSecret = editStrategy === 'STATIC' && selected.sourceReference?.masked && !editValue;
        const finalStrategy = preservedSecret ? 'SECRET' : strategyMap[editStrategy];
        const finalSource = preservedSecret ? selected.sourceReference : sourceReference;
        const response = await apiAxios.patch(`/api/projects/${projectId}/field-data-rules/${selected.id}`, { valueStrategy: finalStrategy, changeScope: editScope, sourceReference: finalSource, status: needsAttention({ ...selected, valueStrategy: finalStrategy, sourceReference: finalSource }) ? 'REVIEW_REQUIRED' : 'ACCEPTED' });
        setSelected(response.data.data);
      }
      setEditMessage('Rule saved.'); await load();
    } catch { setEditMessage('Rule could not be saved.'); }
  };
  const runBulk = async (kind: 'DYNAMIC' | 'ENVIRONMENT' | 'DATASET' | 'REVIEW') => {
    const targets = rules.filter((rule) => selectedIds.includes(rule.id));
    if (kind === 'ENVIRONMENT' || kind === 'DATASET') { setBulkMode(kind); setBulkMappings({}); setBulkReplaceAccepted(false); return; }
    const compatible = targets.filter((rule) => rule.status !== 'ACCEPTED' && (kind !== 'DYNAMIC' || ['string', 'email', 'uuid', 'number', 'integer', 'boolean', 'date', 'datetime'].includes(String(rule.semanticType).toLowerCase())));
    if (!compatible.length) { setEditMessage('No compatible unaccepted fields selected. Existing accepted rules were not overwritten.'); return; }
    await Promise.all(compatible.map((rule) => apiAxios.patch(`/api/projects/${projectId}/field-data-rules/${rule.id}`, kind === 'REVIEW' ? { status: 'REVIEW_REQUIRED' } : { valueStrategy: 'GENERATE', changeScope: 'EACH_EXECUTION', sourceReference: { type: 'generator', generator: rule.semanticType || 'string' }, status: 'ACCEPTED' })));
    setSelectedIds([]); setEditMessage(`${compatible.length} compatible rule${compatible.length === 1 ? '' : 's'} updated.`); await load();
  };
  const saveBulkConfiguration = async () => {
    if (!bulkMode) return;
    const targets = rules.filter((rule) => selectedIds.includes(rule.id));
    const allowed = targets.filter((rule) => bulkReplaceAccepted || rule.status !== 'ACCEPTED');
    const complete = allowed.filter((rule) => Boolean(bulkMappings[rule.id]) && (bulkMode !== 'ENVIRONMENT' || bulkEnvironmentId) && (bulkMode !== 'DATASET' || bulkDatasetId));
    const incomplete = allowed.length - complete.length;
    if (complete.length === 0) { setEditMessage('Choose a mapping for at least one compatible field. No rules were changed.'); return; }
    await Promise.all(complete.map((rule) => apiAxios.patch(`/api/projects/${projectId}/field-data-rules/${rule.id}`, bulkMode === 'ENVIRONMENT' ? { valueStrategy: 'ENVIRONMENT', sourceReference: { type: 'environment', environmentId: bulkEnvironmentId, field: bulkMappings[rule.id] }, status: 'ACCEPTED' } : { valueStrategy: 'DATASET', sourceReference: { type: 'dataset', datasetId: bulkDatasetId, field: bulkMappings[rule.id] }, status: 'ACCEPTED' })));
    setEditMessage(`${complete.length} rule${complete.length === 1 ? '' : 's'} configured${incomplete ? `; ${incomplete} skipped because mappings were incomplete.` : '.'}`);
    setBulkMode(null); setSelectedIds([]); await load();
  };
  const visibleRules = rules.filter((rule) => tab === 'all' ? true : tab === 'attention' ? needsAttention(rule) : strategyLabel(rule).toUpperCase() === tab);
  const reviewItems = rules.filter((item) => needsAttention(item));
  const links = rules.filter((item) => item.valueStrategy === 'LINKED_RESPONSE');
  const readyCount = rules.filter((rule) => !needsAttention(rule) && rule.status === 'ACCEPTED').length;
  const attentionCount = rules.filter(needsAttention).length;
  const strategyCounts = Object.fromEntries(['DYNAMIC', 'STATIC', 'DATASET', 'ENVIRONMENT', 'SECRET', 'LINKED', 'RUNTIME'].map((strategy) => [strategy, rules.filter((rule) => strategyLabel(rule).toUpperCase() === strategy).length]));
  return <section className='space-y-4' aria-label='Execution data workspace'>
    {selectedIds.length > 0 && <div className='flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm'><span>{selectedIds.length} selected</span><Button size='sm' onClick={() => void runBulk('DYNAMIC')}>Assign Dynamic</Button><Button size='sm' variant='outline' onClick={() => void runBulk('ENVIRONMENT')}>Assign Environment</Button><Button size='sm' variant='outline' onClick={() => void runBulk('DATASET')}>Assign Dataset</Button><Button size='sm' variant='outline' onClick={() => void runBulk('REVIEW')}>Mark for review</Button></div>}
    {bulkMode && <section className='space-y-3 rounded-lg border border-primary/40 bg-surface p-4'><div className='flex items-center justify-between'><div><h3 className='font-semibold'>Bulk {bulkMode === 'ENVIRONMENT' ? 'Environment' : 'Dataset'} configuration</h3><p className='text-xs text-text-secondary'>Map each selected field before saving. Complete mappings become Ready; incomplete fields are skipped.</p></div><Button size='sm' variant='ghost' onClick={() => setBulkMode(null)}>Cancel</Button></div>{bulkMode === 'ENVIRONMENT' ? <select value={bulkEnvironmentId} onChange={(event) => setBulkEnvironmentId(event.target.value)} className='h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Select environment</option>{catalogs.environments.map((environment: any) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}</select> : <select value={bulkDatasetId} onChange={(event) => setBulkDatasetId(event.target.value)} className='h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Select dataset</option>{catalogs.datasets.map((dataset: any) => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}</select>}<div className='space-y-2'>{rules.filter((rule) => selectedIds.includes(rule.id)).map((rule) => <label key={rule.id} className='grid gap-2 rounded border border-border p-2 md:grid-cols-[1fr_1fr]'><span><strong>{rule.input?.path}</strong><small className='ml-2 text-text-secondary'>{operationLabel(rule)} · {locationLabel(rule.input?.location)}</small></span>{bulkMode === 'ENVIRONMENT' ? <select value={bulkMappings[rule.id] || ''} onChange={(event) => setBulkMappings((current) => ({ ...current, [rule.id]: event.target.value }))} className='h-8 rounded border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Select variable</option>{Object.keys(catalogs.environments.find((environment: any) => environment.id === bulkEnvironmentId)?.variables || {}).map((name) => <option key={name} value={name}>{name}</option>)}</select> : <select value={bulkMappings[rule.id] || ''} onChange={(event) => setBulkMappings((current) => ({ ...current, [rule.id]: event.target.value }))} className='h-8 rounded border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Select dataset column</option>{bulkColumns.filter((column) => !column.dataType || !rule.semanticType || String(column.dataType).toLowerCase() === String(rule.semanticType).toLowerCase() || ['string', 'email', 'uuid', 'date', 'datetime'].includes(String(column.dataType).toLowerCase())).map((column) => <option key={column.id || column.name} value={column.name}>{column.name}</option>)}</select>}</label>)}</div>{rules.some((rule) => selectedIds.includes(rule.id) && rule.status === 'ACCEPTED') && <label className='flex items-center gap-2 text-xs text-text-secondary'><input type='checkbox' checked={bulkReplaceAccepted} onChange={(event) => setBulkReplaceAccepted(event.target.checked)} />I explicitly want to replace accepted rules</label>}<Button size='sm' onClick={() => void saveBulkConfiguration()}>Save mapped rules</Button></section>}
    {editMessage && <p role='status' className='text-sm text-text-secondary'>{editMessage}</p>}
    {reanalyzeMessage && <p role='status' className='text-sm text-text-secondary'>{reanalyzeMessage}</p>}
    {loading && <p className='rounded-lg border border-border p-5 text-sm text-text-secondary'>Loading your test data setup…</p>}
    {error && <div className='rounded-lg border border-error/40 p-4 text-sm text-error'>{error} <Button size='sm' variant='ghost' onClick={() => void load()}>Try again</Button></div>}
    {!loading && !error && tab !== 'datasets' && visibleRules.length > 0 && <div className='flex flex-wrap gap-2 rounded-lg border border-border p-2 text-xs'>{visibleRules.map((rule) => <label key={`select-${rule.id}`} className='flex items-center gap-1 rounded border border-border px-2 py-1'><input type='checkbox' checked={selectedIds.includes(rule.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, rule.id] : current.filter((id) => id !== rule.id))} />{rule.input?.path}</label>)}</div>}
    {selected && <aside className='space-y-3 rounded-lg border border-primary/40 bg-surface p-4'><div className='flex items-center justify-between'><div><h3 className='font-semibold'>{selected.input?.path}</h3><p className='text-xs text-text-secondary'>{operationLabel(selected)} · {locationLabel(selected.input?.location)} · {selected.required ? 'Required' : 'Optional'}</p></div><Button size='sm' variant='ghost' onClick={() => setSelected(null)}>Close</Button></div><div className='grid gap-2 md:grid-cols-2'><label className='text-xs text-text-secondary'>Value strategy<select value={editStrategy} onChange={(event) => setEditStrategy(event.target.value)} className='mt-1 h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value='DYNAMIC'>Dynamic</option><option value='STATIC'>Static</option><option value='DATASET'>Dataset</option><option value='ENVIRONMENT'>Environment</option><option value='SECRET'>Secret</option><option value='LINKED'>Linked</option><option value='RUNTIME'>Runtime</option></select></label><label className='text-xs text-text-secondary'>Scope<select value={editScope} onChange={(event) => setEditScope(event.target.value)} className='mt-1 h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value='EACH_REQUEST'>Per request</option><option value='EACH_EXECUTION'>Per execution</option><option value='TEST_CASE'>Per test case</option><option value='SUITE_RUN'>Per suite run</option></select></label></div>{editStrategy === 'DYNAMIC' && <input value={editGenerator} onChange={(event) => setEditGenerator(event.target.value)} placeholder='Generator: email, uuid, string…' className='h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text' />}{editStrategy === 'STATIC' && <><input value={editValue} onChange={(event) => setEditValue(event.target.value)} placeholder={selected.sourceReference?.masked ? 'Enter a new sensitive value (optional)' : 'Fixed value'} className='h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text' /><p className='text-xs text-text-secondary'>{selected.sourceReference?.masked ? 'Existing sensitive value is preserved and never displayed.' : 'Non-sensitive fixed value.'}</p></>}{editStrategy === 'DATASET' && <div className='grid gap-2 md:grid-cols-2'><select value={editReference.datasetId} onChange={(event) => setEditReference((current) => ({ ...current, datasetId: event.target.value }))} className='h-9 rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Dataset</option>{catalogs.datasets.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input value={editReference.field} onChange={(event) => setEditReference((current) => ({ ...current, field: event.target.value }))} placeholder='Dataset column' className='h-9 rounded-lg border border-border bg-background/80 px-2 text-sm text-text' /></div>}{editStrategy === 'ENVIRONMENT' && <div className='grid gap-2 md:grid-cols-2'><select value={editReference.environmentId} onChange={(event) => setEditReference((current) => ({ ...current, environmentId: event.target.value }))} className='h-9 rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Environment</option>{catalogs.environments.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input value={editReference.field} onChange={(event) => setEditReference((current) => ({ ...current, field: event.target.value }))} placeholder='Variable name' className='h-9 rounded-lg border border-border bg-background/80 px-2 text-sm text-text' /></div>}{editStrategy === 'SECRET' && <select value={editReference.secretRef} onChange={(event) => setEditReference((current) => ({ ...current, secretRef: event.target.value }))} className='h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Secret reference</option>{catalogs.environments.flatMap((item: any) => Object.values(item.variables || {}).filter((value: any) => value?.secretRef).map((value: any) => <option key={value.secretRef} value={value.secretRef}>{value.secretRef}</option>))}</select>}{editStrategy === 'LINKED' && <div className='grid gap-2 md:grid-cols-2'><select value={editReference.operationId} onChange={(event) => setEditReference((current) => ({ ...current, operationId: event.target.value }))} className='h-9 rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Source operation</option>{catalogs.operations.map((item: any) => <option key={item.id} value={item.id}>{item.method} {item.path}</option>)}</select><input value={editReference.responsePath} onChange={(event) => setEditReference((current) => ({ ...current, responsePath: event.target.value }))} placeholder='$.id' className='h-9 rounded-lg border border-border bg-background/80 px-2 text-sm text-text' /></div>}{editStrategy === 'RUNTIME' && <select value={editReference.variableId} onChange={(event) => setEditReference((current) => ({ ...current, variableId: event.target.value }))} className='h-9 w-full rounded-lg border border-border bg-background/80 px-2 text-sm text-text'><option value=''>Runtime variable</option>{catalogs.variables.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<Button size='sm' onClick={() => void saveSelectedRule()}>Save canonical rule</Button></aside>}
    {!loading && !error && <div className='space-y-3'><div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>{[['Ready', readyCount, 'Configured inputs'], ['Needs Attention', attentionCount, 'Decisions or fixes required'], ['Dynamic', strategyCounts.DYNAMIC, 'Generated values'], ['Linked', strategyCounts.LINKED, 'Previous responses'], ['Missing Source', rules.filter((rule) => !rule.valueStrategy || rule.valueStrategy === 'UNRESOLVED').length, 'No configured source']].map(([label, value, detail]) => <button key={String(label)} type='button' onClick={() => { setTab(label === 'Ready' ? 'all' : label === 'Needs Attention' ? 'attention' : label === 'Dynamic' ? 'DYNAMIC' : label === 'Linked' ? 'LINKED' : 'attention'); onViewChange('primary'); }} className='rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50'><p className='text-xs text-text-secondary'>{label}</p><p className='mt-1 text-xl font-semibold text-text'>{String(value)}</p><p className='mt-1 text-xs text-text-secondary'>{detail as string}</p></button>)}</div></div>}
    {!loading && !error && tab !== 'datasets' && <div className='overflow-x-auto rounded-lg border border-border'><table className='w-full text-sm'><thead className='bg-surface text-left text-text-secondary'><tr>{['Field / input', 'API / operation', 'Location', 'Strategy', 'Configuration', 'Status', 'Actions'].map((header) => <th key={header} className='px-3 py-2'>{header}</th>)}</tr></thead><tbody>{visibleRules.map((rule) => <tr key={rule.id} className='border-t border-border'><td className='px-3 py-2'><p className='font-medium'>{rule.input?.path}</p><p className='text-xs text-text-secondary'>{rule.required ? 'Required' : 'Optional'}</p></td><td className='px-3 py-2'>{operationLabel(rule)}</td><td className='px-3 py-2 capitalize'>{locationLabel(rule.input?.location)}</td><td className='px-3 py-2'>{strategyLabel(rule)}</td><td className='max-w-xs px-3 py-2 text-xs text-text-secondary'>{configurationSummary(rule)}</td><td className='px-3 py-2'><button onClick={() => setSelected(rule)}><Badge variant={needsAttention(rule) ? 'outline' : 'success'}>{needsAttention(rule) ? 'NEEDS ATTENTION' : rule.valueStrategy === 'LINKED_RESPONSE' ? 'LINKED' : 'READY'}</Badge></button></td><td className='px-3 py-2'>{needsAttention(rule) ? <Button size='sm' onClick={() => void accept(rule)}>Review</Button> : <Button size='sm' variant='ghost' onClick={() => setSelected(rule)}>Configure</Button>}</td></tr>)}</tbody></table>{visibleRules.length === 0 && <div className='p-5 text-sm text-text-secondary'>{tab === 'attention' ? 'Nothing needs attention.' : 'No rules in this strategy yet.'}</div>}</div>}
    <div className='flex flex-wrap items-center gap-2'>{tabs.map(([id, label]) => <Button key={id} size='sm' variant={tab === id ? 'default' : 'outline'} onClick={() => { setTab(id); if (id === 'datasets') onDatasets(); onViewChange(id === 'datasets' ? 'datasets' : 'primary'); }}>{label}</Button>)}{rules.some((rule) => rule.status !== 'ACCEPTED' && rule.status !== 'UNRESOLVED' && rule.optionalFieldPolicy === 'OMIT') && <Button size='sm' onClick={() => void acceptOptionalSuggestions()}>Accept optional omissions</Button>}{rules.length > 0 && <Button size='sm' variant='outline' className='border-error/50 text-error hover:bg-error/10' loading={clearBusy} onClick={() => void clearRules()}>Delete analyzed rules</Button>}</div>
    {!loading && !error && tab === 'review' && <div className='space-y-3'>{reviewItems.map((item, index) => <article key={`${item.input?.operationId}-${item.input?.location}-${item.input?.path}-${index}`} className='rounded-lg border border-border bg-surface p-4'><p className='font-medium text-text'>Decide how to provide “{item.input?.path}” for {item.input?.operationLabel || item.input?.operationId || 'this operation'}</p><p className='mt-2 text-sm text-text-secondary'>TestForge needs your input because {item.status === 'UNRESOLVED' ? 'no safe value source was found.' : (item.rationale || []).join(' ') || 'the contract does not make the best source unambiguous.'}</p><p className='mt-2 text-sm text-text-secondary'>Suggested action: {userFacingStrategy(item.strategy)}. {userFacingScope(item.scope)}</p><div className='mt-3 flex flex-wrap gap-2'><Button size='sm' onClick={() => void accept(item)}>Accept suggestion</Button><Button size='sm' variant='outline' onClick={() => { setSelected(item); setTab('rules'); }}>Configure</Button></div></article>)}{reviewItems.length === 0 && <div className='rounded-lg border border-dashed border-border p-5 text-sm text-text-secondary'>Nothing needs your attention. TestForge has a usable rule for every analyzed input.</div>}</div>}
    {!loading && !error && tab === 'runtime' && <div className='space-y-2'>{links.map((item, index) => <div key={`${item.input?.operationId}-${item.input?.path}-${index}`} className='rounded-lg border border-border p-3 text-sm'><p className='font-medium text-text'>{runtimeFlow(item)}</p><p className='mt-1 text-xs text-text-secondary'>{item.status === 'ACCEPTED' ? 'Ready to pass this value at runtime.' : 'Review this connection before execution.'}</p></div>)}{links.length === 0 && <div className='rounded-lg border border-dashed border-border p-5 text-sm text-text-secondary'>No runtime links yet. Add one only when an earlier operation produces a value a later operation needs.</div>}</div>}
  </section>;
};
