// Import Environment modal for importing environment configurations.
import React from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';
import { isValidUrl } from '../../../utils/validation';

export interface ImportEnvironmentModalData {
  source: 'file' | 'url';
  fileName?: string;
  url?: string;
  format: string;
}

export interface ImportEnvironmentModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ImportEnvironmentModalData) => void;
}

const formatOptions = [
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'env', label: '.env file' },
];

export const ImportEnvironmentModal = ({ open, onClose, onImport }: ImportEnvironmentModalProps) => {
  const [source, setSource] = React.useState<'file' | 'url'>('file');
  const [fileName, setFileName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [format, setFormat] = React.useState('json');
  const [error, setError] = React.useState<string | undefined>(undefined);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setSource('file');
      setFileName('');
      setUrl('');
      setFormat('json');
      setError(undefined);
    }
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setError(undefined);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (source === 'file' && !fileName) {
      setError('Please select a file to upload');
      return;
    }

    if (source === 'url') {
      if (!url.trim()) {
        setError('Please enter a URL to sync from');
        return;
      }
      if (!isValidUrl(url.trim())) {
        setError('Please enter a valid URL starting with http:// or https://');
        return;
      }
    }

    onImport({
      source,
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
            <CardTitle>Import Environment</CardTitle>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={onClose}
              aria-label='Close'
              type='button'
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
                >
                  <Upload className='mr-2 h-4 w-4' />
                  Upload File
                </Button>
                <Button
                  type='button'
                  variant={source === 'url' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => { setSource('url'); setError(undefined); }}
                >
                  <Upload className='mr-2 h-4 w-4' />
                  Sync from URL
                </Button>
              </div>
            </div>

            {/* File upload */}
            {source === 'file' && (
              <div>
                <label className='mb-1.5 block text-sm font-medium text-text'>Environment File</label>
                <div
                  className='flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:bg-surface'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className='mb-2 h-8 w-8 text-text-secondary' />
                  <p className='text-sm text-text-secondary'>
                    {fileName ? fileName : 'Click to select a file'}
                  </p>
                  <p className='mt-1 text-xs text-text-secondary'>Supports JSON, YAML, .env</p>
                  <input
                    ref={fileInputRef}
                    type='file'
                    className='hidden'
                    accept='.json,.yaml,.yml,.env'
                    onChange={handleFileChange}
                  />
                </div>
              </div>
            )}

            {/* URL input */}
            {source === 'url' && (
              <TextInput
                label='Environment URL'
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(undefined); }}
                placeholder='https://example.com/environment.json'
              />
            )}

            {/* Format select */}
            <Select
              label='File Format'
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              options={formatOptions}
            />

            {error && (
              <p className='text-sm text-error' role='alert'>{error}</p>
            )}
          </CardContent>
          <CardFooter className='justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit'>Import</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ImportEnvironmentModal;