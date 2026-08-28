// VersionHistoryPage - Displays version history for entities
import { useState, useEffect, useCallback } from 'react';
import { useVersions, useVersionComparison } from '../hooks';
import { versioningService } from '../services';
import type { Version, EntityType } from '../types';
import { useParams } from 'react-router-dom';
import { AdminPageIntro } from '../../../components/shared/AdminPageIntro';
import { PageEmpty, PageError, PageLoading } from '../../../components/shared/PageState';

export function VersionHistoryPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { versions, loading, error, refetch } = useVersions(projectId || null);
  const { comparison, loading: comparing, compare } = useVersionComparison(projectId || null);

  const [selectedEntityType, setSelectedEntityType] = useState<EntityType | ''>('');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [version1, setVersion1] = useState('');
  const [version2, setVersion2] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const filteredVersions = versions.filter(v => {
    if (!selectedEntityType && !selectedEntityId) return true;
    if (selectedEntityType && v.entityType !== selectedEntityType) return false;
    if (selectedEntityId && v.entityId !== selectedEntityId) return false;
    return true;
  });

  const handleRestore = async (versionId: string) => {
    if (!projectId) return;
    if (!confirm('Are you sure you want to restore this version?')) return;
    try {
      await versioningService.restoreVersion(projectId, versionId);
      refetch();
      alert('Version restored successfully');
    } catch (err) {
      console.error('Failed to restore version:', err);
      alert('Failed to restore version');
    }
  };

  const handleCompare = async () => {
    if (!version1 || !version2) {
      alert('Please select two versions to compare');
      return;
    }
    await compare({ versionId1: version1, versionId2: version2 });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEntityTypeColor = (entityType: EntityType) => {
    const colors: Record<EntityType, string> = {
      Requirement: 'bg-primary/15 text-primary',
      Knowledge: 'bg-success/15 text-success',
      Dataset: 'bg-primary/15 text-primary',
      Assertion: 'bg-warning/15 text-warning',
      TestSuite: 'bg-error/15 text-error',
      ExecutionProfile: 'bg-primary/15 text-primary',
      ExecutionPlan: 'bg-primary/15 text-primary',
      Report: 'bg-background text-text-secondary',
    };
    return colors[entityType] || 'bg-background text-text-secondary';
  };

  if (loading) return <PageLoading title="Loading versions..." />;
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <PageError
        title="Failed to load version history"
        message={message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="w-full px-4 py-6 lg:px-8">
      <AdminPageIntro
        title="Version history"
        description="Browse versions by entity type, compare two snapshots, or restore a prior state."
      >
        <button
          onClick={() => setCompareMode(!compareMode)}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 text-sm"
        >
          {compareMode ? 'Exit compare mode' : 'Compare versions'}
        </button>
      </AdminPageIntro>

      {/* Filters */}
      <div className="bg-surface border border-border shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Entity Type</label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value as EntityType | '')}
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            >
              <option value="">All Types</option>
              <option value="Requirement">Requirement</option>
              <option value="Knowledge">Knowledge</option>
              <option value="Dataset">Dataset</option>
              <option value="Assertion">Assertion</option>
              <option value="TestSuite">Test Suite</option>
              <option value="ExecutionProfile">Execution Profile</option>
              <option value="ExecutionPlan">Execution Plan</option>
              <option value="Report">Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entity ID</label>
            <input
              type="text"
              value={selectedEntityId}
              onChange={(e) => setSelectedEntityId(e.target.value)}
              placeholder="Filter by entity ID"
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            />
          </div>
        </div>
      </div>

      {/* Compare Mode */}
      {compareMode && (
        <div className="bg-surface border border-border shadow rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Compare Versions</h3>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Version 1 (Old)</label>
              <select
                value={version1}
                onChange={(e) => setVersion1(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-background text-text rounded"
              >
                <option value="">Select version</option>
                {filteredVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} - {v.entityType} ({v.entityId.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Version 2 (New)</label>
              <select
                value={version2}
                onChange={(e) => setVersion2(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-background text-text rounded"
              >
                <option value="">Select version</option>
                {filteredVersions.map(v => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} - {v.entityType} ({v.entityId.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:bg-background disabled:text-text-secondary"
            >
              {comparing ? 'Comparing...' : 'Compare'}
            </button>
          </div>

          {/* Comparison Results */}
          {comparison && (
            <div className="mt-4 rounded border border-border bg-background p-4">
              <h4 className="font-semibold mb-3">Differences Found: {comparison.differences.length}</h4>
              {comparison.differences.length === 0 ? (
                <p className="text-text-secondary">No differences found between these versions.</p>
              ) : (
                <div className="space-y-2">
                  {comparison.differences.map((diff, idx) => (
                    <div key={idx} className="border border-border rounded p-3 bg-surface">
                      <div className="font-medium text-sm mb-2">{diff.field}</div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-error font-medium mb-1">Old Value:</div>
                          <pre className="bg-error/10 border border-error/20 p-2 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(diff.oldValue, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-success font-medium mb-1">New Value:</div>
                          <pre className="bg-success/10 border border-success/20 p-2 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(diff.newValue, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Versions Timeline */}
      <div className="bg-surface border border-border shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Version Timeline</h2>
        </div>
        
        {filteredVersions.length === 0 ? (
          <PageEmpty
            title="No versions found"
            description="Versions are created automatically when entities are modified."
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredVersions
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((version) => (
                <div
                  key={version.id}
                  className="p-6 hover:bg-background transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold">v{version.versionNumber}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getEntityTypeColor(version.entityType)}`}>
                          {version.entityType}
                        </span>
                        <span className="text-sm text-text-secondary">
                          ID: {version.entityId.slice(0, 8)}...
                        </span>
                      </div>
                      
                      {version.changeSummary && (
                        <p className="text-sm text-text-secondary mb-2">{version.changeSummary}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <span>By: {version.createdBy}</span>
                        <span>•</span>
                        <span>{formatDate(version.createdAt)}</span>
                      </div>

                      {/* Snapshot Preview */}
                      <details className="mt-3">
                        <summary className="text-sm text-primary cursor-pointer hover:text-primary">
                          View Snapshot
                        </summary>
                        <pre className="mt-2 bg-background p-3 rounded text-xs overflow-auto max-h-64">
                          {JSON.stringify(version.snapshot, null, 2)}
                        </pre>
                      </details>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setSelectedVersion(version)}
                        className="px-3 py-1 text-sm bg-primary/15 text-primary rounded hover:bg-primary/25"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleRestore(version.id)}
                        className="px-3 py-1 text-sm bg-success/15 text-success rounded hover:bg-success/25"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default VersionHistoryPage;
