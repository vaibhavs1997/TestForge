// Import / Sync API modal for uploading API specs or syncing from a URL.
import React from 'react';
import { X, Upload, Link2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';

export interface ImportApiModalData {
  source: 'file' | 'url';
  file?: File;
  fileName?: string;
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

export const ImportApiModal = ({ open, onClose, onImport, isImporting, uploadProgress }: ImportApiModalProps) => {
  const [source, setSource] = React.useState<'file' | 'url'>('file');
  const [fileName, setFileName] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [url, setUrl] = React.useState('');
  const [format, setFormat] = React.useState('openapi');
  const [error, setError] = React.useState<string | undefined>(undefined);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSource('file');
      setFileName('');
      setFile(null);
      setUrl('');
      setFormat('openapi');
      setError(undefined);
    }
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      setFile(f);
      setError(undefined);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (source === 'file' && !fileName) {
      setError('Please select a file to upload');
      return;
    }

    if (source === 'url' && !url.trim()) {
      setError('Please enter a URL to sync from');
      return;
    }

    onImport({
      source,
      file: source === 'file' ? file ?? undefined : undefined,
      fileName: source === 'file' ? fileName : undefined,
      url: source === 'url' ? url.trim() : undefined,
      format,
    });
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onClose}
    >
      <Card className='mx-4 w-full max-w-lg' onClick={(e) => e.stopPropagation()}>
        <CardHeader>
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
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4'>
            {/* Source toggle */}
            <div>
              <label className='mb-1.5 block text-sm font-medium text-text'>Import Source</label>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant={source === 'file' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => { setSource('file'); setError(undefined); }}
                  disabled={isImporting}
                >
                  <Upload className='mr-2 h-4 w-4' />
                  Upload File
                </Button>
                <Button
                  type='button'
                  variant={source === 'url' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => { setSource('url'); setError(undefined); }}
                  disabled={isImporting}
                >
                  <Link2 className='mr-2 h-4 w-4' />
                  Sync from URL
                </Button>
              </div>
            </div>

            {/* File upload */}
            {source === 'file' && (
              <div>
                <label className='mb-1.5 block text-sm font-medium text-text'>API Spec File</label>
                <div
                  className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:bg-surface'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className='mb-2 h-8 w-8 text-text-secondary' />
                  <p className='text-sm text-text-secondary'>
                    {fileName ? fileName : 'Click to select a file'}
                  </p>
                  <p className='mt-1 text-xs text-text-secondary'>Supported Specifications</p>
                  <p className='mt-0.5 text-xs text-text-secondary'>• OpenAPI 3.x (.json, .yaml, .yml)</p>
                  <p className='text-xs text-text-secondary'>• Swagger 2.0</p>
                  <p className='text-xs text-text-secondary'>• Postman Collection v2.1</p>
                  <p className='text-xs text-text-secondary'>• GraphQL Schema (.graphql)</p>
                  <p className='text-xs text-text-secondary'>• GraphQL Introspection (.json)</p>
                  <input
                    ref={fileInputRef}
                    type='file'
                    className='hidden'
                    accept='.json,.yaml,.yml,.xml,.wsdl,.graphql'
                    onChange={handleFileChange}
                    disabled={isImporting}
                  />
                </div>
              </div>
            )}

            {/* URL input */}
            {source === 'url' && (
              <TextInput
                label='API Specification URL'
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(undefined); }}
                placeholder='https://company.com/openapi.yaml'
                disabled={isImporting}
              />
            )}

            {/* Format select */}
            <Select
              label='API Format'
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              options={formatOptions}
              disabled={isImporting}
            />

            {/* Upload progress */}
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
              <p className='text-sm text-error' role='alert'>{error}</p>
            )}
          </CardContent>
          <CardFooter className='justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isImporting}>
              {source === 'file' ? 'Import' : 'Sync'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ImportApiModal;
