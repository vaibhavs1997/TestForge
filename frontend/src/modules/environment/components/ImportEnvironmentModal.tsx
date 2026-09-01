// Import Environment modal for importing environment configurations.
import React from 'react';
import { X, Upload, Link2, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';
import { isValidUrl } from '../../../utils/validation';

export interface ImportEnvironmentModalData {
  source: 'file' | 'url';
  files?: File[];
  url?: string;
  format?: string;
}

export interface ImportEnvironmentModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ImportEnvironmentModalData) => void;
  isImporting?: boolean;
  importError?: string;
}

const formatOptions = [
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'env', label: '.env file' },
];

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

export const ImportEnvironmentModal = ({
  open,
  onClose,
  onImport,
  isImporting,
  importError,
}: ImportEnvironmentModalProps) => {
  const [source, setSource] = React.useState<'file' | 'url'>('file');
  const [files, setFiles] = React.useState<File[]>([]);
  const [url, setUrl] = React.useState('');
  const [format, setFormat] = React.useState('auto');
  const [error, setError] = React.useState<string | undefined>(undefined);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSource('file');
      setFiles([]);
      setUrl('');
      setFormat('auto');
      setError(undefined);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [open]);

  if (!open) return null;

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setError(undefined);
    const incoming = Array.from(fileList);
    setFiles((prev) => {
      const ids = new Set(prev.map(fileKey));
      return [...prev, ...incoming.filter((f) => !ids.has(fileKey(f)))];
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (key: string) => {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (source === 'file') {
      if (files.length === 0) {
        setError('Select one or more files to import');
        return;
      }
      onImport({
        source: 'file',
        files,
        format: format === 'auto' ? undefined : format,
      });
      return;
    }

    if (!url.trim()) {
      setError('Please enter a URL to sync from');
      return;
    }
    if (!isValidUrl(url.trim())) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    onImport({
      source: 'url',
      url: url.trim(),
      format: format === 'auto' ? undefined : format,
    });
  };

  const hasFiles = files.length > 0;

  return (
    <div
      className='app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <Card
        className='app-modal-panel flex max-h-[90vh] w-full max-w-lg flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className='shrink-0'>
          <div className='flex items-center justify-between'>
            <CardTitle>Import Environment</CardTitle>
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
                <label className='mb-1.5 block text-sm font-medium text-text'>Environment files</label>
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
                    hasFiles
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-surface cursor-pointer'
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isImporting) addFiles(e.dataTransfer.files);
                  }}
                  onClick={() => !isImporting && fileInputRef.current?.click()}
                >
                  <Upload
                    className={`mb-2 h-8 w-8 ${hasFiles ? 'text-primary' : 'text-text-secondary'}`}
                  />
                  <p className='text-center text-sm font-medium text-text'>
                    {hasFiles ? 'Add more files (click or drop)' : 'Click or drop files here'}
                  </p>
                  <p className='mt-1 text-center text-xs text-text-secondary'>
                    Ctrl+click to select multiple. JSON, YAML, Postman env, .env
                  </p>
                  {hasFiles && (
                    <p className='mt-2 text-xs text-text-secondary'>
                      {files.length} file{files.length === 1 ? '' : 's'} queued
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type='file'
                    multiple
                    className='hidden'
                    accept='.json,.yaml,.yml,.env,.env.local'
                    onChange={(e) => addFiles(e.target.files)}
                    disabled={isImporting}
                  />
                </div>

                {files.length > 0 && (
                  <ul className='mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2'>
                    {files.map((file) => {
                      const key = fileKey(file);
                      return (
                        <li
                          key={key}
                          className='flex items-center justify-between gap-2 rounded px-2 py-1 text-sm'
                        >
                          <span className='min-w-0 truncate font-medium text-text'>{file.name}</span>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-7 shrink-0 px-2'
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(key);
                            }}
                            disabled={isImporting}
                          >
                            Remove
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {source === 'url' && (
              <TextInput
                label='Environment URL'
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(undefined);
                }}
                placeholder='https://example.com/environment.json'
                disabled={isImporting}
              />
            )}

            <Select
              label='File format (optional)'
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              options={[{ value: 'auto', label: 'Auto-detect' }, ...formatOptions]}
              disabled={isImporting}
            />
            <p className='text-xs text-text-secondary'>
              Format is detected from file contents. Override only if auto-detect is wrong.
            </p>

            {(error || importError) && (
              <p className='text-sm text-error' role='alert'>
                {error || importError}
              </p>
            )}
          </CardContent>
          <CardFooter className='shrink-0 justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isImporting}>
              {isImporting ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              {source === 'file' && files.length > 1 ? 'Import all' : 'Import'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ImportEnvironmentModal;
