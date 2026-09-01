// AuditLogPage - Displays audit logs for the project
import { useState, useEffect, useCallback } from 'react';
import { useAuditLogs } from '../hooks';
import { auditService } from '../services';
import type { AuditLog, AuditModule, AuditAction, AuditLogFilters } from '../types';
import { useParams } from 'react-router-dom';
import { AdminPageIntro } from '../../../components/shared/AdminPageIntro';
import { PageEmpty, PageError, PageLoading } from '../../../components/shared/PageState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { Trash2 } from 'lucide-react';

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
  const [logToDelete, setLogToDelete] = useState<AuditLog | null>(null);
  const [deletingLog, setDeletingLog] = useState(false);

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

  const handleDelete = async () => {
    if (!logToDelete) return;
    setDeletingLog(true);
    try {
      await auditService.deleteAuditLog(logToDelete.id);
      if (selectedLog?.id === logToDelete.id) setSelectedLog(null);
      setLogToDelete(null);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete audit log';
      window.alert(message);
    } finally {
      setDeletingLog(false);
    }
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
      'ARCHIVE': 'bg-warning/15 text-warning',
      'OPEN': 'bg-primary/15 text-primary',
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
    <div className="w-full px-4 py-6 lg:px-8">
      {/* The optional-workflows banner is intentionally omitted from this page.
        <WorkflowOptionalBanner
          description="Compliance and troubleshooting trail. Not needed for the everyday import → test → report flow."
          projectId={projectId}
        />
      */}
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
            <SelectField
              className="w-full"
              value={filters.module}
              onChange={(value) => handleFilterChange('module', value)}
              options={[
                { value: '', label: 'All Modules' },
                { value: 'Project', label: 'Project' },
                { value: 'API', label: 'API' },
                { value: 'Environment', label: 'Environment' },
                { value: 'Dataset', label: 'Dataset' },
                { value: 'Knowledge', label: 'Knowledge' },
                { value: 'Requirement', label: 'Requirement' },
                { value: 'Assertion', label: 'Assertion' },
                { value: 'ExecutionPlan', label: 'Execution Plan' },
                { value: 'ExecutionProfile', label: 'Execution Profile' },
                { value: 'TestSuite', label: 'Test Suite' },
                { value: 'Scheduler', label: 'Scheduler' },
                { value: 'Execution', label: 'Execution' },
                { value: 'Report', label: 'Report' },
                { value: 'Notification', label: 'Notification' },
                { value: 'Provider', label: 'Provider' },
                { value: 'Version', label: 'Version' },
                { value: 'Analysis', label: 'Analysis' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action</label>
            <SelectField
              className="w-full"
              value={filters.action}
              onChange={(value) => handleFilterChange('action', value)}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'CREATE', label: 'CREATE' },
                { value: 'UPDATE', label: 'UPDATE' },
                { value: 'DELETE', label: 'DELETE' },
                { value: 'EXECUTE', label: 'EXECUTE' },
                { value: 'GENERATE', label: 'GENERATE' },
                { value: 'APPROVE', label: 'APPROVE' },
                { value: 'REJECT', label: 'REJECT' },
                { value: 'RESTORE', label: 'RESTORE' },
                { value: 'ENABLE', label: 'ENABLE' },
                { value: 'DISABLE', label: 'DISABLE' },
                { value: 'ARCHIVE', label: 'ARCHIVE' },
                { value: 'OPEN', label: 'OPEN' },
              ]}
            />
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary hover:text-primary"
                      >
                        View Details
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-error hover:bg-error/10 hover:text-error"
                        onClick={() => setLogToDelete(log)}
                        aria-label={`Delete audit log for ${log.entityType}`}
                        title="Delete audit log"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="app-modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="app-modal-panel border border-border rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
              <Button
                type="button"
                variant="destructive"
                onClick={() => setLogToDelete(selectedLog)}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Delete log
              </Button>
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

      <ConfirmDialog
        open={!!logToDelete}
        title="Delete audit log"
        message={`Delete the ${logToDelete?.action || ''} record for ${logToDelete?.entityType || 'this entity'}? This cannot be undone.`}
        confirmLabel="Delete log"
        variant="destructive"
        isLoading={deletingLog}
        onConfirm={handleDelete}
        onCancel={() => { if (!deletingLog) setLogToDelete(null); }}
      />
    </div>
  );
}

export default AuditLogPage;
