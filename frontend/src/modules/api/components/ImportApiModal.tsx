// Import / Sync API modal for uploading API specs or syncing from a URL.
import React from 'react';
import { X, Upload, Link2, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';
import {
  classifyImportFiles,
  type ClassifiedFile,
  type ImportFileKind,
} from '../../import/utils/classifyImportFile';

export interface ImportApiModalData {
  source: 'file' | 'url';
  items?: ClassifiedFile[];
  url?: string;
  format: string;
}

export interface ImportApiModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ImportApiModalData) => void;
  isImporting?: boolean;
  uploadProgress?: number;
}

const formatOptions = [
  { value: 'openapi', label: 'OpenAPI / Swagger (JSON/YAML)' },
  { value: 'postman', label: 'Postman Collection' },
  { value: 'har', label: 'HAR File' },
  { value: 'wsdl', label: 'WSDL (SOAP)' },
  { value: 'graphql', label: 'GraphQL Schema' },
];

const KIND_LABEL: Record<ImportFileKind, string> = {
  'api-contract': 'API contract',
  environment: 'Environment',
  unknown: 'Unknown',
};

export const ImportApiModal = ({ open, onClose, onImport, isImporting, uploadProgress }: ImportApiModalProps) => {
  const [source, setSource] = React.useState<'file' | 'url'>('file');
  const [items, setItems] = React.useState<ClassifiedFile[]>([]);
  const [classifying, setClassifying] = React.useState(false);
  const [url, setUrl] = React.useState('');
  const [format, setFormat] = React.useState('openapi');
  const [error, setError] = React.useState<string | undefined>(undefined);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSource('file');
      setItems([]);
      setUrl('');
      setFormat('openapi');
      setError(undefined);
      setClassifying(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  if (!open) return null;

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setClassifying(true);
    setError(undefined);
    try {
      const incoming = await classifyImportFiles(Array.from(fileList));
      setItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((f) => !ids.has(f.id))];
      });
    } finally {
      setClassifying(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const setKind = (id: string, kind: ImportFileKind) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              kind,
              reason: kind === 'unknown' ? 'Manual' : `Set to ${KIND_LABEL[kind]}`,
            }
          : item,
      ),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const hasFiles = items.length > 0;
  const canSubmitFiles =
    hasFiles && items.some((i) => i.kind === 'api-contract' || i.kind === 'environment');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (source === 'file') {
      if (!hasFiles) {
        setError('Select one or more files to import');
        return;
      }
      if (!canSubmitFiles) {
        setError('Set each file to API contract or Environment (or remove unknown files)');
        return;
      }
      onImport({
        source: 'file',
        items,
        format,
      });
      return;
    }

    if (!url.trim()) {
      setError('Please enter a URL to sync from');
      return;
    }

    onImport({
      source: 'url',
      url: url.trim(),
      format,
    });
  };

  const contractCount = items.filter((i) => i.kind === 'api-contract').length;
  const envCount = items.filter((i) => i.kind === 'environment').length;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <Card
        className='flex max-h-[90vh] w-full max-w-lg flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className='shrink-0'>
          <div className='flex items-center justify-between'>
            <CardTitle>Import / Sync APIs</CardTitle>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={onClose}
              aria-label='Close'
              type='button'
              disabled={isImporting}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
          <CardContent className='min-h-0 flex-1 space-y-4 overflow-y-auto'>
            <div>
              <label className='mb-1.5 block text-sm font-medium text-text'>Import Source</label>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant={source === 'file' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => {
                    setSource('file');
                    setError(undefined);
                  }}
                  disabled={isImporting}
                >
                  <Upload className='mr-2 h-4 w-4' />
                  Upload Files
                </Button>
                <Button
                  type='button'
                  variant={source === 'url' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => {
                    setSource('url');
                    setError(undefined);
                  }}
                  disabled={isImporting}
                >
                  <Link2 className='mr-2 h-4 w-4' />
                  Sync from URL
                </Button>
              </div>
            </div>

            {source === 'file' && (
              <div>
                <label className='mb-1.5 block text-sm font-medium text-text'>
                  API specs &amp; environment files
                </label>
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                    hasFiles
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-surface cursor-pointer'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isImporting && !classifying) void addFiles(e.dataTransfer.files);
                  }}
                  onClick={() => !isImporting && !classifying && fileInputRef.current?.click()}
                >
                  {classifying ? (
                    <Loader2 className='mb-2 h-8 w-8 animate-spin text-primary' />
                  ) : (
                    <Upload
                      className={`mb-2 h-8 w-8 ${hasFiles ? 'text-primary' : 'text-text-secondary'}`}
                    />
                  )}
                  <p className='text-center text-sm font-medium text-text'>
                    {classifying
                      ? 'Classifying files…'
                      : hasFiles
                        ? 'Add more files (click or drop)'
                        : 'Click or drop files here'}
                  </p>
                  <p className='mt-1 text-center text-xs text-text-secondary'>
                    Select multiple with Ctrl+click. OpenAPI, Postman collection, Postman env, .env
                  </p>
                  {hasFiles && (
                    <p className='mt-2 text-xs text-text-secondary'>
                      {contractCount} API contract{contractCount === 1 ? '' : 's'}, {envCount}{' '}
                      environment{envCount === 1 ? '' : 's'}
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type='file'
                    multiple
                    className='hidden'
                    accept='.json,.yaml,.yml,.xml,.wsdl,.graphql,.gql,.env,.env.local'
                    onChange={(e) => void addFiles(e.target.files)}
                    disabled={isImporting || classifying}
                  />
                </div>

                {items.length > 0 && (
                  <div className='mt-3 max-h-48 overflow-y-auto rounded-lg border border-border'>
                    <table className='min-w-full text-left text-xs'>
                      <thead className='sticky top-0 border-b border-border bg-surface text-text-secondary'>
                        <tr>
                          <th className='px-2 py-1.5 font-medium'>File</th>
                          <th className='px-2 py-1.5 font-medium'>Type</th>
                          <th className='px-2 py-1.5 font-medium' />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className='border-b border-border last:border-0'>
                            <td className='max-w-[140px] truncate px-2 py-1.5 font-medium text-text'>
                              {item.file.name}
                            </td>
                            <td className='px-2 py-1.5'>
                              <select
                                className='max-w-full rounded border border-border bg-background px-1.5 py-0.5 text-xs'
                                value={item.kind}
                                onChange={(e) => setKind(item.id, e.target.value as ImportFileKind)}
                                disabled={isImporting}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <option value='api-contract'>API contract</option>
                                <option value='environment'>Environment</option>
                                <option value='unknown'>Unknown</option>
                              </select>
                            </td>
                            <td className='px-2 py-1.5 text-right'>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                className='h-7 px-2'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(item.id);
                                }}
                                disabled={isImporting}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {source === 'url' && (
              <>
                <TextInput
                  label='API Specification URL'
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(undefined);
                  }}
                  placeholder='https://company.com/openapi.yaml'
                  disabled={isImporting}
                />
                <Select
                  label='API Format'
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  options={formatOptions}
                  disabled={isImporting}
                />
              </>
            )}

            {isImporting && uploadProgress !== undefined && uploadProgress >= 0 && (
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className='h-2 w-full rounded-full bg-surface'>
                  <div
                    className='h-2 rounded-full bg-primary transition-all duration-200'
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <p className='text-sm text-error' role='alert'>
                {error}
              </p>
            )}
          </CardContent>
          <CardFooter className='shrink-0 justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isImporting || classifying}>
              {source === 'file' ? (items.length > 1 ? 'Import all' : 'Import') : 'Sync'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ImportApiModal;
