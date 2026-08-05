// Backup & Restore Page
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Download, Upload, Archive, RotateCcw, Trash2, Database, FileArchive } from 'lucide-react';

interface BackupMetadata {
  id: string;
  createdAt: string;
  version: string;
  buildTimestamp: string;
  gitCommit: string;
  schemaVersion: number;
  applicationVersion: string;
  migrationVersion: number;
  sizeBytes: number;
  fileCount: number;
}

export const BackupPage: React.FC = () => {
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  
  const breadcrumbItems = [
    { label: 'Projects', to: '/projects' },
    { label: 'Project', to: '/projects/1/overview' },
    { label: 'Backup & Restore' },
  ];
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'copy' | 'merge'>('copy');
  const [importFile, setImportFile] = useState<File | null>(null);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        setBackups(await res.json());
      }
    } catch {
      setToastMessage('Failed to load backups');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backups', { method: 'POST' });
      if (res.ok) {
        setToastMessage('Backup created successfully');
        setToastType('success');
        await loadBackups();
      } else {
        setToastMessage('Failed to create backup');
        setToastType('error');
      }
    } catch {
      setToastMessage('Failed to create backup');
      setToastType('error');
    } finally {
      setLoading(false);
      setToastOpen(true);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/backups/${selectedBackup.id}/restore`, { method: 'POST' });
      const result = await res.json();
      setToastMessage(result.message || 'Restore completed');
      setToastType(result.success ? 'success' : 'error');
    } catch {
      setToastMessage('Restore failed');
      setToastType('error');
    } finally {
      setLoading(false);
      setRestoreOpen(false);
      setToastOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;
    try {
      const res = await fetch(`/api/backups/${selectedBackup.id}`, { method: 'DELETE' });
      const result = await res.json();
      setToastMessage(result.message || 'Backup deleted');
      setToastType('success');
      await loadBackups();
    } catch {
      setToastMessage('Delete failed');
      setToastType('error');
    } finally {
      setDeleteOpen(false);
      setToastOpen(true);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects/1/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: 'TestForge Project' }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'testforge-project-export.zip';
        a.click();
        URL.revokeObjectURL(url);
        setToastMessage('Project exported successfully');
        setToastType('success');
      } else {
        setToastMessage('Export failed');
        setToastType('error');
      }
    } catch {
      setToastMessage('Export failed');
      setToastType('error');
    } finally {
      setLoading(false);
      setToastOpen(true);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('mode', importMode);
      const res = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      setToastMessage(result.message || 'Import completed');
      setToastType(result.success ? 'success' : 'error');
    } catch {
      setToastMessage('Import failed');
      setToastType('error');
    } finally {
      setLoading(false);
      setImportFile(null);
      setToastOpen(true);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className='mx-auto max-w-7xl px-6 py-8'>
      {/* Breadcrumbs */}
      <nav className='flex items-center gap-2 text-sm text-text-secondary mb-4'>
        {breadcrumbItems.map((item, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span>/</span>}
            {item.to ? (
              <a href={item.to} className='hover:text-text'>{item.label}</a>
            ) : (
              <span className='text-text'>{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Backup & Restore</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Create manual backups, export projects, and restore from previous states.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={handleExport} disabled={loading}>
            <Download className='mr-2 h-4 w-4' />
            Export Project
          </Button>
          <Button onClick={handleCreateBackup} disabled={loading}>
            <Archive className='mr-2 h-4 w-4' />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='text-base'>Import Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center gap-3'>
            <input
              type='file'
              accept='.zip,.tar.gz'
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className='flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm'
            />
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as any)}
              className='rounded-lg border border-border bg-background px-3 py-2 text-sm'
            >
              <option value='copy'>Create Copy</option>
              <option value='replace'>Replace Existing</option>
              <option value='merge'>Merge</option>
            </select>
            <Button onClick={handleImport} disabled={!importFile || loading}>
              <Upload className='mr-2 h-4 w-4' />
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && backups.length === 0 ? (
            <p className='py-8 text-center text-sm text-text-secondary'>Loading backups...</p>
          ) : backups.length === 0 ? (
            <div className='py-8 text-center'>
              <Database className='mx-auto mb-4 h-12 w-12 text-text-secondary' />
              <p className='text-sm font-medium text-text'>No backups yet</p>
              <p className='text-xs text-text-secondary'>Create your first backup to get started.</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {backups.map((backup) => (
                <div key={backup.id} className='flex items-center justify-between rounded-lg border border-border p-4'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <FileArchive className='h-4 w-4 text-primary' />
                      <span className='text-sm font-medium text-text'>{backup.id}</span>
                      <Badge variant='outline' className='text-xs'>v{backup.version}</Badge>
                    </div>
                    <div className='flex items-center gap-3 text-xs text-text-secondary'>
                      <span>Created: {new Date(backup.createdAt).toLocaleString()}</span>
                      <span>Size: {formatSize(backup.sizeBytes)}</span>
                      <span>Files: {backup.fileCount}</span>
                      <span>Schema: v{backup.schemaVersion}</span>
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => { setSelectedBackup(backup); setRestoreOpen(true); }}
                    >
                      <RotateCcw className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => { setSelectedBackup(backup); setDeleteOpen(true); }}
                    >
                      <Trash2 className='h-4 w-4 text-error' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={restoreOpen}
        title='Restore Backup'
        message={`Restoring "${selectedBackup?.id}" will replace all current data. This cannot be undone.`}
        confirmLabel='Restore'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleRestore}
        onCancel={() => setRestoreOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Backup'
        message={`Deleting "${selectedBackup?.id}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <Toast
        message={toastMessage}
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        type={toastType}
      />
    </div>
  );
};

export default BackupPage;