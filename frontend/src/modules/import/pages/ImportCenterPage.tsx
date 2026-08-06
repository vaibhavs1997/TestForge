// External libraries
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// Services
import { projectService } from '../../../services/ProjectService';
import { auditService } from '../../audit/services';
import type { AuditLog } from '../../audit/types';
import { projectStore } from '../../../store/projectStore';

// Components
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';
import { UnifiedImportWizard } from '../components/UnifiedImportWizard';

export interface ImportCenterPageProps {}

interface ImportJob {
  id: string;
  fileName: string;
  status: 'completed' | 'failed';
  progress: number;
  recordsImported: number;
  timestamp: string;
  projectId: string;
}

function auditToImportJob(log: AuditLog): ImportJob | null {
  if (log.module !== 'API' || log.entityType !== 'ApiContract') return null;
  const fileName =
    (log.newValue?.fileName as string | undefined) ||
    (log.metadata?.fileName as string | undefined) ||
    'API contract';
  const records =
    Number(log.newValue?.operationsImported ?? log.metadata?.operationsImported ?? 0) +
    Number(log.newValue?.servicesImported ?? log.metadata?.servicesImported ?? 0);

  return {
    id: log.id,
    fileName,
    status: log.action === 'CREATE' || log.action === 'UPDATE' ? 'completed' : 'failed',
    progress: 100,
    recordsImported: records,
    timestamp: new Date(log.timestamp).toISOString(),
    projectId: log.projectId,
  };
}

export const ImportCenterPage: React.FC<ImportCenterPageProps> = () => {
  const navigate = useNavigate();
  const selectedProjectId = projectStore((s) => s.selectedProjectId);
  const [search, setSearch] = React.useState('');

  const { data: importJobs = [], isLoading: isLoadingJobs, isError, error } = useQuery({
    queryKey: ['import-center', 'audit-imports'],
    queryFn: async () => {
      const projects = await projectService.listProjects();
      const logs = await Promise.all(
        projects.map((p) =>
          auditService
            .getAuditLogs(p.id, { module: 'API', entityType: 'ApiContract' })
            .catch(() => [] as AuditLog[]),
        ),
      );
      return logs
        .flat()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map(auditToImportJob)
        .filter((j): j is ImportJob => j !== null);
    },
    staleTime: 60_000,
  });

  const filteredJobs = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return importJobs;
    return importJobs.filter((job) => job.fileName.toLowerCase().includes(term));
  }, [search, importJobs]);

  const completed = importJobs.filter((j) => j.status === 'completed').length;
  const failed = importJobs.filter((j) => j.status === 'failed').length;
  const successRate =
    importJobs.length > 0 ? `${Math.round((completed / importJobs.length) * 100)}%` : '—';

  const goToApis = () => {
    const pid = selectedProjectId ?? importJobs[0]?.projectId;
    if (pid) navigate(`/projects/${pid}/apis`);
    else navigate('/projects');
  };

  const getStatusBadge = (status: ImportJob['status']) => {
    const variants: Record<ImportJob['status'], 'success' | 'destructive'> = {
      completed: 'success',
      failed: 'destructive',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (isLoadingJobs) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-text">Import Center</h1>
        <p className="mt-1 text-sm text-text-secondary">Loading import history…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Import Center</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Import API contracts and environments in one place, or review past contract imports
          </p>
        </div>
        <Button variant="outline" onClick={goToApis}>
          Open APIs in project
        </Button>
      </div>

      <UnifiedImportWizard />

      <h2 className="mb-4 text-lg font-semibold text-text">Import history</h2>

      {isError && (
        <p className="mb-4 text-sm text-error">
          {error instanceof Error ? error.message : 'Failed to load import history'}
        </p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Total Imports</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{importJobs.length || '—'}</div>
            <p className="text-xs text-text-secondary">Recorded API contract events</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{successRate}</div>
            <p className="text-xs text-text-secondary">Based on audit actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">Failed Imports</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text">{importJobs.length ? failed : '—'}</div>
            <p className="text-xs text-text-secondary">Non create/update events</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search import jobs..." className="sm:w-80" />
      </div>

      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={<Upload className="h-12 w-12" />}
          title="No import jobs found"
          description={
            search
              ? 'Try adjusting your search criteria.'
              : 'Use the wizard above to import contracts and environments, or import from a project APIs page.'
          }
          action={search ? undefined : { label: 'Go to APIs', onClick: goToApis }}
        />
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {job.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-medium text-text">{job.fileName}</h4>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      Project {job.projectId}
                      {job.recordsImported > 0 ? ` · ${job.recordsImported} records` : ''}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {new Date(job.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/projects/${job.projectId}/audit`)}
                  >
                    View audit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImportCenterPage;
