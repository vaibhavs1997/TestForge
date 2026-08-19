// AuditLogPage - Displays audit logs for the project
import { useState, useEffect, useCallback } from 'react';
import { useAuditLogs } from '../hooks';
import { auditService } from '../services';
import type { AuditLog, AuditModule, AuditAction, AuditLogFilters } from '../types';
import { useParams } from 'react-router-dom';
import { AdminPageIntro } from '../../../components/shared/AdminPageIntro';
import { WorkflowOptionalBanner } from '../../../components/shared/WorkflowOptionalBanner';
import { PageEmpty, PageError, PageLoading } from '../../../components/shared/PageState';

export function AuditLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>({});
  const { data: logs = [], isLoading: loading, isError, error, refetch } = useAuditLogs(projectId || null, appliedFilters);

  const [filters, setFilters] = useState<{
    module: AuditModule | '';
    action: AuditAction | '';
    entityType: string;
    entityId: string;
    startDate: string;
    endDate: string;
  }>({
    module: '',
    action: '',
    entityType: '',
    entityId: '',
    startDate: '',
    endDate: '',
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = useCallback(() => {
    setAppliedFilters({
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.startDate ? { startDate: new Date(filters.startDate).getTime() } : {}),
      ...(filters.endDate ? { endDate: new Date(filters.endDate).getTime() } : {}),
    });
  }, [filters]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: AuditAction) => {
    const colors: Record<AuditAction, string> = {
      'CREATE': 'bg-success/15 text-success',
      'UPDATE': 'bg-primary/15 text-primary',
      'DELETE': 'bg-error/15 text-error',
      'EXECUTE': 'bg-primary/15 text-primary',
      'GENERATE': 'bg-primary/15 text-primary',
      'APPROVE': 'bg-success/15 text-success',
      'REJECT': 'bg-error/15 text-error',
      'RESTORE': 'bg-warning/15 text-warning',
      'ENABLE': 'bg-success/15 text-success',
      'DISABLE': 'bg-background text-text-secondary',
    };
    return colors[action] || 'bg-background text-text-secondary';
  };

  const getModuleColor = (module: AuditModule) => {
    const colors: Record<AuditModule, string> = {
      'Project': 'bg-background text-text-secondary',
      'API': 'bg-primary/15 text-primary',
      'Environment': 'bg-success/15 text-success',
      'Dataset': 'bg-primary/15 text-primary',
      'Knowledge': 'bg-warning/15 text-warning',
      'Requirement': 'bg-error/15 text-error',
      'Assertion': 'bg-primary/15 text-primary',
      'ExecutionPlan': 'bg-primary/15 text-primary',
      'ExecutionProfile': 'bg-warning/15 text-warning',
      'TestSuite': 'bg-success/15 text-success',
      'Scheduler': 'bg-primary/15 text-primary',
      'Execution': 'bg-success/15 text-success',
      'Report': 'bg-warning/15 text-warning',
      'Notification': 'bg-error/15 text-error',
      'Provider': 'bg-success/15 text-success',
      'Version': 'bg-primary/15 text-primary',
      'Analysis': 'bg-primary/15 text-primary',
    };
    return colors[module] || 'bg-background text-text-secondary';
  };

  if (loading) return <PageLoading title="Loading audit logs..." />;
  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <PageError
        title="Failed to load audit logs"
        message={message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="w-full max-w-none p-6">
      {projectId && (
        <WorkflowOptionalBanner
          description="Compliance and troubleshooting trail. Not needed for the everyday import → test → report flow."
          projectId={projectId}
        />
      )}
      <AdminPageIntro
        title="Audit log"
        description="Filter and inspect create, update, and delete events across modules in this project."
      />

      {/* Filters */}
      <div className="bg-surface border border-border shadow rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Module</label>
            <select
              value={filters.module}
              onChange={(e) => handleFilterChange('module', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            >
              <option value="">All Modules</option>
              <option value="Project">Project</option>
              <option value="API">API</option>
              <option value="Environment">Environment</option>
              <option value="Dataset">Dataset</option>
              <option value="Knowledge">Knowledge</option>
              <option value="Requirement">Requirement</option>
              <option value="Assertion">Assertion</option>
              <option value="ExecutionPlan">Execution Plan</option>
              <option value="ExecutionProfile">Execution Profile</option>
              <option value="TestSuite">Test Suite</option>
              <option value="Scheduler">Scheduler</option>
              <option value="Execution">Execution</option>
              <option value="Report">Report</option>
              <option value="Notification">Notification</option>
              <option value="Provider">Provider</option>
              <option value="Version">Version</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="EXECUTE">EXECUTE</option>
              <option value="GENERATE">GENERATE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="RESTORE">RESTORE</option>
              <option value="ENABLE">ENABLE</option>
              <option value="DISABLE">DISABLE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entity Type</label>
            <input
              type="text"
              value={filters.entityType}
              onChange={(e) => handleFilterChange('entityType', e.target.value)}
              placeholder="Filter by entity type"
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entity ID</label>
            <input
              type="text"
              value={filters.entityId}
              onChange={(e) => handleFilterChange('entityId', e.target.value)}
              placeholder="Filter by entity ID"
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-border bg-background text-text rounded"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Apply Filters
          </button>
          <button
            onClick={() => {
              setFilters({
                module: '',
                action: '',
                entityType: '',
                entityId: '',
                startDate: '',
                endDate: '',
              });
              setAppliedFilters({});
            }}
            className="ml-2 px-4 py-2 border border-border rounded hover:bg-background"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-surface border border-border shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Audit Trail</h2>
        </div>

        {logs.length === 0 ? (
          <PageEmpty
            title="No audit logs found"
            description="Try adjusting filters or perform an action to generate audit activity."
          />
        ) : (
          <table className="min-w-full">
            <thead className="bg-background/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Performed By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-background">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getModuleColor(log.module)}`}>
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div>
                      <div className="font-medium">{log.entityType}</div>
                      <div className="text-xs text-text-secondary">ID: {log.entityId.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.performedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-primary hover:text-primary"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-text-secondary hover:text-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Log ID</label>
                  <div className="text-sm text-text">{selectedLog.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Timestamp</label>
                  <div className="text-sm text-text">{formatDate(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Module</label>
                  <div className="text-sm text-text">{selectedLog.module}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Action</label>
                  <div className="text-sm text-text">{selectedLog.action}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Entity Type</label>
                  <div className="text-sm text-text">{selectedLog.entityType}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Entity ID</label>
                  <div className="text-sm text-text">{selectedLog.entityId}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Performed By</label>
                  <div className="text-sm text-text">{selectedLog.performedBy}</div>
                </div>
              </div>

              {/* Old Value */}
              {selectedLog.oldValue && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Old Value</label>
                  <pre className="bg-error/10 p-4 rounded text-xs overflow-auto max-h-64 border border-error/30">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Value */}
              {selectedLog.newValue && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">New Value</label>
                  <pre className="bg-success/10 p-4 rounded text-xs overflow-auto max-h-64 border border-success/30">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Metadata</label>
                  <pre className="bg-background p-4 rounded text-xs overflow-auto max-h-64 border border-border">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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

export default AuditLogPage;
