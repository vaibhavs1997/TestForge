// AuditLogPage - Displays audit logs for the project
import { useState, useEffect, useCallback } from 'react';
import { useAuditLogs } from '../hooks';
import { auditService } from '../services';
import type { AuditLog, AuditModule, AuditAction } from '../types';
import { useParams } from 'react-router-dom';
import { AdminPageIntro } from '../../../components/shared/AdminPageIntro';
import { WorkflowOptionalBanner } from '../../../components/shared/WorkflowOptionalBanner';

export function AuditLogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: logs = [], isLoading: loading, isError, error, refetch } = useAuditLogs(projectId || null);

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
    const filterParams: any = {};
    if (filters.module) filterParams.module = filters.module;
    if (filters.action) filterParams.action = filters.action;
    if (filters.entityType) filterParams.entityType = filters.entityType;
    if (filters.entityId) filterParams.entityId = filters.entityId;
    if (filters.startDate) filterParams.startDate = new Date(filters.startDate).getTime();
    if (filters.endDate) filterParams.endDate = new Date(filters.endDate).getTime();
    
    // Refetch with filters
    refetch();
  }, [filters, refetch]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getActionColor = (action: AuditAction) => {
    const colors: Record<AuditAction, string> = {
      'CREATE': 'bg-green-100 text-green-800',
      'UPDATE': 'bg-blue-100 text-blue-800',
      'DELETE': 'bg-red-100 text-red-800',
      'EXECUTE': 'bg-purple-100 text-purple-800',
      'GENERATE': 'bg-indigo-100 text-indigo-800',
      'APPROVE': 'bg-green-100 text-green-800',
      'REJECT': 'bg-red-100 text-red-800',
      'RESTORE': 'bg-yellow-100 text-yellow-800',
      'ENABLE': 'bg-green-100 text-green-800',
      'DISABLE': 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const getModuleColor = (module: AuditModule) => {
    const colors: Record<AuditModule, string> = {
      'Project': 'bg-gray-100 text-gray-800',
      'API': 'bg-blue-100 text-blue-800',
      'Environment': 'bg-green-100 text-green-800',
      'Dataset': 'bg-purple-100 text-purple-800',
      'Knowledge': 'bg-yellow-100 text-yellow-800',
      'Requirement': 'bg-red-100 text-red-800',
      'Assertion': 'bg-pink-100 text-pink-800',
      'ExecutionPlan': 'bg-indigo-100 text-indigo-800',
      'ExecutionProfile': 'bg-orange-100 text-orange-800',
      'TestSuite': 'bg-teal-100 text-teal-800',
      'Scheduler': 'bg-cyan-100 text-cyan-800',
      'Execution': 'bg-lime-100 text-lime-800',
      'Report': 'bg-amber-100 text-amber-800',
      'Notification': 'bg-rose-100 text-rose-800',
      'Provider': 'bg-emerald-100 text-emerald-800',
      'Version': 'bg-violet-100 text-violet-800',
      'Analysis': 'bg-fuchsia-100 text-fuchsia-800',
    };
    return colors[module] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <div className="p-4">Loading audit logs...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {String(error)}</div>;

  return (
    <div className="mx-auto max-w-7xl p-6">
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
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Module</label>
            <select
              value={filters.module}
              onChange={(e) => handleFilterChange('module', e.target.value)}
              className="w-full px-3 py-2 border rounded"
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
              className="w-full px-3 py-2 border rounded"
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
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Entity ID</label>
            <input
              type="text"
              value={filters.entityId}
              onChange={(e) => handleFilterChange('entityId', e.target.value)}
              placeholder="Filter by entity ID"
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
              refetch();
            }}
            className="ml-2 px-4 py-2 border rounded hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Audit Trail</h2>
        </div>

        {logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No audit logs found.
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
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
                      <div className="text-xs text-gray-500">ID: {log.entityId.slice(0, 8)}...</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.performedBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800"
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
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Log ID</label>
                  <div className="text-sm text-gray-900">{selectedLog.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                  <div className="text-sm text-gray-900">{formatDate(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Module</label>
                  <div className="text-sm text-gray-900">{selectedLog.module}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action</label>
                  <div className="text-sm text-gray-900">{selectedLog.action}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Entity Type</label>
                  <div className="text-sm text-gray-900">{selectedLog.entityType}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Entity ID</label>
                  <div className="text-sm text-gray-900">{selectedLog.entityId}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Performed By</label>
                  <div className="text-sm text-gray-900">{selectedLog.performedBy}</div>
                </div>
              </div>

              {/* Old Value */}
              {selectedLog.oldValue && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Old Value</label>
                  <pre className="bg-red-50 p-4 rounded text-xs overflow-auto max-h-64 border border-red-200">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* New Value */}
              {selectedLog.newValue && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Value</label>
                  <pre className="bg-green-50 p-4 rounded text-xs overflow-auto max-h-64 border border-green-200">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Metadata</label>
                  <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto max-h-64 border border-gray-200">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
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

export default AuditLogPage;