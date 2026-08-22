import React from 'react';
import { apiAxios } from '../../../services/apiAxios';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

type Tab = 'rules' | 'review' | 'datasets' | 'runtime';
const tabs: Array<[Tab, string]> = [['rules', 'Data Rules'], ['review', 'Needs Review'], ['datasets', 'Datasets'], ['runtime', 'Linked Values']];
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
const sourceLabel = (rule: any) => rule.sourceReference?.secretRef ? 'Secure value' : rule.sourceReference?.field || rule.sourceReference?.id || rule.sourceReference?.value !== undefined ? 'Configured source' : 'No source selected';

/** Presentation-only canonical-rule workspace; inference and resolution remain server-side. */
export const ExecutionDataWorkspace: React.FC<{ projectId: string; onDatasets: () => void; onViewChange: (view: 'primary' | 'datasets') => void; refreshToken?: number }> = ({ projectId, onDatasets, onViewChange, refreshToken = 0 }) => {
  const [tab, setTab] = React.useState<Tab>('rules');
  const [rules, setRules] = React.useState<any[]>([]);
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(emptySummary);
  const [selected, setSelected] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [reanalyzeMessage, setReanalyzeMessage] = React.useState('');
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
  const accept = async (suggestion: any) => { await (suggestion.id ? apiAxios.post(`/api/projects/${projectId}/field-data-rules/${suggestion.id}/accept`) : apiAxios.post(`/api/projects/${projectId}/field-data-rules`, { ...suggestion, projectId, status: 'ACCEPTED' })); await load(); };
  const reanalyze = async () => { setReanalyzeMessage('Analyzing the current contract…'); try { const response = await apiAxios.post(`/api/projects/${projectId}/field-data-analysis/reanalyze`); const result = response.data.data || {}; setReanalyzeMessage(`${result.newInputs || 0} new inputs and ${result.reviewRequiredChanges || 0} changes need attention.`); await load(); } catch { setReanalyzeMessage('Analysis could not be completed.'); } };
  const reviewItems = suggestions.filter((item) => item.status !== 'AUTO_ACCEPTABLE');
  const links = [...rules, ...suggestions].filter((item) => item.valueStrategy === 'LINKED_RESPONSE' || item.strategy === 'LINKED_RESPONSE');
  const secureCount = rules.filter((rule) => rule.valueStrategy === 'SECRET').length;
  return <section className='space-y-4' aria-label='Execution data workspace'>
    <div className='flex flex-wrap gap-2'>{tabs.map(([id, label]) => <Button key={id} size='sm' variant={tab === id ? 'default' : 'outline'} onClick={() => { setTab(id); if (id === 'datasets') onDatasets(); onViewChange(id === 'datasets' ? 'datasets' : 'primary'); }}>{label}</Button>)}</div>
    {reanalyzeMessage && <p role='status' className='text-sm text-text-secondary'>{reanalyzeMessage}</p>}
    {loading && <p className='rounded-lg border border-border p-5 text-sm text-text-secondary'>Loading your test data setup…</p>}
    {error && <div className='rounded-lg border border-error/40 p-4 text-sm text-error'>{error} <Button size='sm' variant='ghost' onClick={() => void load()}>Try again</Button></div>}
    {!loading && !error && <div className='space-y-3'><div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>{[['Ready', summary.ready, 'Inputs that can be used now'], ['Needs Review', summary.reviewRequired, 'Choices that need your decision'], ['Unresolved', summary.unresolved, 'Required values without a safe source'], ['Linked Values', summary.runtimeLinkSuggestions, 'Values passed between operations']].map(([label, value, detail]) => <button key={String(label)} type='button' onClick={() => { setTab(label === 'Ready' ? 'rules' : label === 'Linked Values' ? 'runtime' : 'review'); onViewChange('primary'); }} className='rounded-lg border border-border bg-surface p-3 text-left hover:border-primary/50'><p className='text-xs text-text-secondary'>{label}</p><p className='mt-1 text-xl font-semibold text-text'>{String(value)}</p><p className='mt-1 text-xs text-text-secondary'>{detail as string}</p></button>)}</div>{summary.totalInputs === 0 && <div className='rounded-lg border border-dashed border-border p-5 text-sm text-text-secondary'>Start by importing a contract, then choose how TestForge should supply values when an API runs.</div>}</div>}
    {!loading && !error && tab === 'rules' && <div className='overflow-x-auto rounded-lg border border-border'><table className='w-full text-sm'><thead className='bg-surface text-left text-text-secondary'><tr>{['Field / input', 'API / operation', 'How the value is supplied', 'Source', 'Status'].map((header) => <th key={header} className='px-3 py-2'>{header}</th>)}</tr></thead><tbody>{rules.map((rule) => <tr key={rule.id} className='border-t border-border'><td className='px-3 py-2'><p className='font-medium'>{rule.input?.path}</p><p className='text-xs text-text-secondary'>{rule.required ? 'Required' : `Optional (${rule.optionalFieldPolicy?.toLowerCase() || 'included'})`}</p></td><td className='px-3 py-2'>{rule.input?.operationLabel || rule.input?.operationId}</td><td className='px-3 py-2'>{userFacingStrategy(rule.valueStrategy, rule.optionalFieldPolicy)}</td><td className='px-3 py-2'>{sourceLabel(rule)}</td><td className='px-3 py-2'><button onClick={() => setSelected(rule)}><Badge variant='outline'>{rule.status === 'ACCEPTED' ? 'Ready' : 'Needs review'}</Badge></button></td></tr>)}</tbody></table>{rules.length === 0 && <div className='p-5 text-sm text-text-secondary'>No data rules yet. Import a contract and use Needs Review to choose how values should be supplied.</div>}</div>}
    {!loading && !error && tab === 'review' && <div className='space-y-3'>{reviewItems.map((item, index) => <article key={`${item.input?.operationId}-${item.input?.location}-${item.input?.path}-${index}`} className='rounded-lg border border-border bg-surface p-4'><p className='font-medium text-text'>Decide how to provide “{item.input?.path}” for {item.input?.operationLabel || item.input?.operationId || 'this operation'}</p><p className='mt-2 text-sm text-text-secondary'>TestForge needs your input because {item.status === 'UNRESOLVED' ? 'no safe value source was found.' : (item.rationale || []).join(' ') || 'the contract does not make the best source unambiguous.'}</p><p className='mt-2 text-sm text-text-secondary'>Suggested action: {userFacingStrategy(item.strategy)}. {userFacingScope(item.scope)}</p><div className='mt-3 flex flex-wrap gap-2'><Button size='sm' onClick={() => void accept(item)}>Accept suggestion</Button><Button size='sm' variant='outline' onClick={() => { setSelected(item); setTab('rules'); }}>Configure</Button></div></article>)}{reviewItems.length === 0 && <div className='rounded-lg border border-dashed border-border p-5 text-sm text-text-secondary'>Nothing needs your attention. TestForge has a usable rule for every analyzed input.</div>}</div>}
    {!loading && !error && tab === 'runtime' && <div className='space-y-2'>{links.map((item, index) => <div key={`${item.input?.operationId}-${item.input?.path}-${index}`} className='rounded-lg border border-border p-3 text-sm'><p className='font-medium text-text'>{runtimeFlow(item)}</p><p className='mt-1 text-xs text-text-secondary'>{item.status === 'ACCEPTED' ? 'Ready to pass this value at runtime.' : 'Review this connection before execution.'}</p></div>)}{links.length === 0 && <div className='rounded-lg border border-dashed border-border p-5 text-sm text-text-secondary'>No runtime links yet. Add one only when an earlier operation produces a value a later operation needs.</div>}</div>}
    {selected && <aside className='rounded-lg border border-primary/40 bg-surface p-4'><div className='flex justify-between'><h3 className='font-semibold'>Rule details</h3><button onClick={() => setSelected(null)}>Close</button></div><p className='mt-2 text-sm text-text-secondary'>Technical metadata is available for troubleshooting only.</p><details className='mt-3'><summary className='cursor-pointer text-sm text-primary'>View details</summary><pre className='mt-2 overflow-auto text-xs text-text-secondary'>{JSON.stringify(selected, null, 2)}</pre></details></aside>}
  </section>;
};
