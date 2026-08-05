// ProjectContextPage - Read-only viewer for the aggregated Project Context object.
// Displays: Project Summary, Expandable sections, Search, Statistics,
// Entity counts, Validation warnings. No editing.
import { useState, useMemo } from 'react';
import { useProjectContext } from '../hooks';
import type { ProjectContext, ValidationWarning } from '../types';

interface ProjectContextPageProps {
  projectId: string;
}

const SECTIONS: { key: keyof ProjectContext; label: string; description: string }[] = [
  { key: 'apis', label: 'APIs', description: 'API services defined in the project' },
  { key: 'apiOperations', label: 'API Operations', description: 'Operations across all API services' },
  { key: 'environments', label: 'Environments', description: 'Configured test environments' },
  { key: 'datasets', label: 'Datasets', description: 'Test data datasets' },
  { key: 'datasetColumns', label: 'Dataset Columns', description: 'Columns across all datasets' },
  { key: 'datasetRelationships', label: 'Dataset Relationships', description: 'Relationships between datasets' },
  { key: 'knowledgeFlows', label: 'Knowledge Flows', description: 'Documented business flows' },
  { key: 'businessRules', label: 'Business Rules', description: 'Business rules governing the project' },
  { key: 'runtimeVariables', label: 'Runtime Variables', description: 'Variables used during execution' },
  { key: 'dependencies', label: 'Dependencies', description: 'External service dependencies' },
  { key: 'documentation', label: 'Documentation', description: 'Project documentation entries' },
  { key: 'analysis', label: 'Analysis', description: 'Project analysis records' },
  { key: 'requirements', label: 'Requirements', description: 'Requirements defined for the project' },
  { key: 'readinessReports', label: 'Readiness Reports', description: 'Readiness report entries' },
  { key: 'testStrategies', label: 'Test Strategies', description: 'Test strategies for requirements' },
  { key: 'testDesigns', label: 'Test Designs', description: 'Detailed test designs' },
  { key: 'executionPlans', label: 'Execution Plans', description: 'Plans for executing test designs' },
  { key: 'assertions', label: 'Assertions', description: 'Reusable assertion definitions' },
  { key: 'suites', label: 'Suites', description: 'Test suites grouping execution plans' },
  { key: 'executionProfiles', label: 'Execution Profiles', description: 'Profiles controlling execution behavior' },
  { key: 'providers', label: 'Providers', description: 'External provider configurations' },
  { key: 'recommendations', label: 'Recommendations', description: 'Deterministic recommendations for the project' },
  { key: 'versions', label: 'Versions', description: 'Versioned entities for the project' },
  { key: 'auditSummary', label: 'Audit Summary', description: 'Audit log entries for the project' },
  { key: 'plugins', label: 'Plugins', description: 'Plugins associated with the project' },
];

const STAT_KEYS: { key: keyof ProjectContext['statistics']; label: string }[] = [
  { key: 'apis', label: 'APIs' },
  { key: 'apiOperations', label: 'API Operations' },
  { key: 'environments', label: 'Environments' },
  { key: 'datasets', label: 'Datasets' },
  { key: 'datasetColumns', label: 'Dataset Columns' },
  { key: 'datasetRelationships', label: 'Dataset Relationships' },
  { key: 'knowledgeFlows', label: 'Knowledge Flows' },
  { key: 'businessRules', label: 'Business Rules' },
  { key: 'runtimeVariables', label: 'Runtime Variables' },
  { key: 'dependencies', label: 'Dependencies' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'requirements', label: 'Requirements' },
  { key: 'readinessReports', label: 'Readiness Reports' },
  { key: 'testStrategies', label: 'Test Strategies' },
  { key: 'testDesigns', label: 'Test Designs' },
  { key: 'executionPlans', label: 'Execution Plans' },
  { key: 'assertions', label: 'Assertions' },
  { key: 'suites', label: 'Suites' },
  { key: 'executionProfiles', label: 'Execution Profiles' },
  { key: 'providers', label: 'Providers' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'versions', label: 'Versions' },
  { key: 'auditEntries', label: 'Audit Entries' },
  { key: 'plugins', label: 'Plugins' },
];

function getSeverityColor(severity: ValidationWarning['severity']): string {
  switch (severity) {
    case 'High':
      return 'bg-red-100 text-red-800';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'Low':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function renderEntitySummary(items: any[]): string {
  if (items.length === 0) return 'No entries';
  const sample = items[0];
  const nameKeys = ['name', 'title', 'id', 'key', 'label'];
  const nameKey = nameKeys.find((k) => k in sample);
  if (nameKey) {
    const names = items.slice(0, 3).map((i) => i[nameKey]);
    const extra = items.length > 3 ? ` (+${items.length - 3} more)` : '';
    return `${names.join(', ')}${extra}`;
  }
  return `${items.length} entries`;
}

export function ProjectContextPage({ projectId }: ProjectContextPageProps) {
  const { context, loading, error, refetch } = useProjectContext(projectId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(SECTIONS.map((s) => s.key)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Build searchable index from all sections
  const searchIndex = useMemo(() => {
    if (!context) return [];
    const index: { section: string; text: string; item: any }[] = [];
    for (const section of SECTIONS) {
      const data = (context[section.key] as any[]) || [];
      for (const item of data) {
        index.push({
          section: section.label,
          text: JSON.stringify(item).toLowerCase(),
          item,
        });
      }
    }
    return index;
  }, [context]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return searchIndex.filter((entry) => entry.text.includes(q));
  }, [searchQuery, searchIndex]);

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-text-secondary'>Building project context...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-4'>
        <div className='text-red-500'>Error: {String(error)}</div>
        <button
          onClick={() => refetch()}
          className='rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90'
        >
          Retry
        </button>
      </div>
    );
  }

  if (!context) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-text-secondary'>No context available</div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Project Context</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Aggregated, read-only view of all project knowledge. Generated at{' '}
            {formatDate(context.generatedAt)}
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={expandAll}
            className='rounded border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface'
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className='rounded border border-border px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-surface'
          >
            Collapse All
          </button>
          <button
            onClick={() => refetch()}
            className='rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90'
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Project Summary */}
      {context.project && (
        <div className='mb-6 rounded-lg border border-border bg-surface p-5'>
          <h2 className='mb-3 text-lg font-semibold text-text'>Project Summary</h2>
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            <div>
              <label className='text-xs font-medium uppercase text-text-secondary'>ID</label>
              <div className='mt-1 text-sm text-text'>{context.project.id}</div>
            </div>
            <div>
              <label className='text-xs font-medium uppercase text-text-secondary'>Name</label>
              <div className='mt-1 text-sm text-text'>{context.project.name}</div>
            </div>
            <div>
              <label className='text-xs font-medium uppercase text-text-secondary'>Status</label>
              <div className='mt-1 text-sm text-text'>{context.project.status}</div>
            </div>
            <div>
              <label className='text-xs font-medium uppercase text-text-secondary'>Description</label>
              <div className='mt-1 text-sm text-text'>
                {context.project.description || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className='mb-6 rounded-lg border border-border bg-surface p-5'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-lg font-semibold text-text'>Statistics</h2>
          <span className='text-sm font-medium text-text-secondary'>
            Total Entities: {context.statistics.totalEntities}
          </span>
        </div>
        <div className='grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5'>
          {STAT_KEYS.map((stat) => (
            <div
              key={stat.key}
              className='rounded border border-border bg-background p-3'
            >
              <div className='text-xs font-medium uppercase text-text-secondary'>
                {stat.label}
              </div>
              <div className='mt-1 text-xl font-bold text-text'>
                {context.statistics[stat.key]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation Warnings */}
      {context.validationWarnings.length > 0 && (
        <div className='mb-6 rounded-lg border border-border bg-surface p-5'>
          <h2 className='mb-3 text-lg font-semibold text-text'>
            Validation Warnings ({context.validationWarnings.length})
          </h2>
          <div className='space-y-2'>
            {context.validationWarnings.map((warning, idx) => (
              <div
                key={`${warning.code}-${idx}`}
                className='flex items-start gap-3 rounded border border-border bg-background p-3'
              >
                <span
                  className={`mt-0.5 rounded px-2 py-0.5 text-xs font-medium ${getSeverityColor(
                    warning.severity
                  )}`}
                >
                  {warning.severity}
                </span>
                <div className='flex-1'>
                  <div className='text-sm font-medium text-text'>{warning.section}</div>
                  <div className='mt-0.5 text-sm text-text-secondary'>{warning.message}</div>
                  <div className='mt-0.5 text-xs text-text-secondary'>{warning.code}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className='mb-6'>
        <input
          type='text'
          placeholder='Search across all project context entities...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className='w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text placeholder:text-text-secondary focus:border-primary focus:outline-none'
        />
        {searchResults && (
          <div className='mt-3 rounded-lg border border-border bg-surface p-4'>
            <div className='mb-2 text-sm font-medium text-text'>
              {searchResults.length} result(s) for "{searchQuery}"
            </div>
            {searchResults.length === 0 ? (
              <div className='text-sm text-text-secondary'>No matches found.</div>
            ) : (
              <div className='max-h-96 space-y-2 overflow-y-auto'>
                {searchResults.slice(0, 50).map((result, idx) => (
                  <div
                    key={idx}
                    className='rounded border border-border bg-background p-3'
                  >
                    <div className='text-xs font-medium uppercase text-text-secondary'>
                      {result.section}
                    </div>
                    <pre className='mt-1 max-h-40 overflow-auto text-xs text-text'>
                      {JSON.stringify(result.item, null, 2)}
                    </pre>
                  </div>
                ))}
                {searchResults.length > 50 && (
                  <div className='text-center text-xs text-text-secondary'>
                    Showing 50 of {searchResults.length} results. Refine your search to see more.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Sections */}
      <div className='space-y-2'>
        {SECTIONS.map((section) => {
          const data = (context[section.key] as any[]) || [];
          const isExpanded = expandedSections.has(section.key);
          return (
            <div
              key={section.key}
              className='rounded-lg border border-border bg-surface'
            >
              <button
                onClick={() => toggleSection(section.key)}
                className='flex w-full items-center justify-between p-4 text-left hover:bg-background'
              >
                <div className='flex items-center gap-3'>
                  <span className='text-sm font-semibold text-text'>{section.label}</span>
                  <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                    {data.length}
                  </span>
                </div>
                <div className='flex items-center gap-3'>
                  <span className='hidden text-xs text-text-secondary md:inline'>
                    {section.description}
                  </span>
                  <svg
                    className={`h-4 w-4 text-text-secondary transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 9l-7 7-7-7'
                    />
                  </svg>
                </div>
              </button>
              {isExpanded && (
                <div className='border-t border-border p-4'>
                  {data.length === 0 ? (
                    <div className='py-4 text-center text-sm text-text-secondary'>
                      No entries in this section.
                    </div>
                  ) : (
                    <>
                      <div className='mb-3 text-xs text-text-secondary'>
                        {renderEntitySummary(data)}
                      </div>
                      <div className='max-h-96 overflow-y-auto'>
                        <pre className='rounded bg-background p-3 text-xs text-text'>
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectContextPage;