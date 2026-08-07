import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { projectService } from '../../../services/ProjectService';
import { projectStore } from '../../../store/projectStore';
import { queryKeys } from '../../../constants';
import { notificationInboxQueryKey } from '../../notification/hooks';
import {
  classifyImportFiles,
  type ClassifiedFile,
  type ImportFileKind,
} from '../utils/classifyImportFile';
import { runUnifiedImport, type UnifiedImportResult } from '../utils/runUnifiedImport';

const KIND_LABEL: Record<ImportFileKind, string> = {
  'api-contract': 'API contract',
  environment: 'Environment',
  unknown: 'Unknown',
};

export const UnifiedImportWizard: React.FC = () => {
  const queryClient = useQueryClient();
  const storeProjectId = projectStore((s) => s.selectedProjectId);
  const [projectId, setProjectId] = React.useState(storeProjectId ?? '');
  const [items, setItems] = React.useState<ClassifiedFile[]>([]);
  const [classifying, setClassifying] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<UnifiedImportResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => projectService.listProjects(),
  });

  React.useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(storeProjectId ?? projects[0].id);
    }
  }, [projectId, projects, storeProjectId]);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setClassifying(true);
    setResult(null);
    try {
      const incoming = await classifyImportFiles(Array.from(fileList));
      setItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((f) => !ids.has(f.id))];
      });
    } finally {
      setClassifying(false);
    }
  };

  const setKind = (id: string, kind: ImportFileKind) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, kind, reason: kind === 'unknown' ? 'Manual' : `Set to ${KIND_LABEL[kind]}` } : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const canRun =
    Boolean(projectId) &&
    items.length > 0 &&
    items.some((i) => i.kind === 'api-contract' || i.kind === 'environment') &&
    !running;

  const handleRun = async () => {
    if (!projectId) return;
    setRunning(true);
    setResult(null);
    try {
      const importResult = await runUnifiedImport(projectId, items);
      setResult(importResult);
      void queryClient.invalidateQueries({ queryKey: queryKeys.services(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) });
      void queryClient.invalidateQueries({ queryKey: notificationInboxQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ['import-center', 'audit-imports'] });
    } finally {
      setRunning(false);
    }
  };

  const contractCount = items.filter((i) => i.kind === 'api-contract').length;
  const envCount = items.filter((i) => i.kind === 'environment').length;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Import into project</CardTitle>
        <CardDescription>
          Drop Postman collections, OpenAPI specs, and environment files together. We classify each file and import
          contracts first, then environments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-text">Target project</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".json,.yaml,.yml,.graphql,.gql,.env,.env.local"
              className="hidden"
              onChange={(e) => void addFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={classifying}
            >
              {classifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Add files
            </Button>
            <Button type="button" onClick={() => void handleRun()} disabled={!canRun}>
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Run import
            </Button>
          </div>
        </div>

        <div
          className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-8 text-center"
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            void addFiles(e.dataTransfer.files);
          }}
        >
          <FileText className="mx-auto h-8 w-8 text-text-secondary" />
          <p className="mt-2 text-sm text-text-secondary">Drag and drop files here, or use Add files</p>
          {items.length > 0 && (
            <p className="mt-1 text-xs text-text-secondary">
              Queued: {contractCount} API contract{contractCount === 1 ? '' : 's'}, {envCount} environment
              {envCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">File</th>
                  <th className="px-3 py-2 font-medium">Detected</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-text">{item.file.name}</td>
                    <td className="px-3 py-2 text-text-secondary">{item.reason}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded border border-border bg-background px-2 py-1 text-xs"
                        value={item.kind}
                        onChange={(e) => setKind(item.id, e.target.value as ImportFileKind)}
                      >
                        <option value="api-contract">API contract</option>
                        <option value="environment">Environment</option>
                        <option value="unknown">Unknown</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium text-text">Import summary</p>
            <p className="text-xs text-text-secondary">
              {result.environmentsUpserted} environment(s) from files ·{' '}
              {result.detectedEnvironmentsSynced} from contract detection
            </p>
            <ul className="space-y-1">
              {result.fileResults.map((r, idx) => (
                <li key={`${r.fileName}-${idx}`} className="flex items-start gap-2 text-sm">
                  {r.status === 'success' && <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />}
                  {r.status === 'failed' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                  {r.status === 'skipped' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
                  <span>
                    <Badge variant="secondary" className="mr-2">
                      {KIND_LABEL[r.kind]}
                    </Badge>
                    {r.fileName}: {r.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnifiedImportWizard;
