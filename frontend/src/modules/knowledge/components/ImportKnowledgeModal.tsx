import React from 'react';
import { Upload, X, Loader2, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';

export interface ImportKnowledgeModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (files: File[]) => void;
  isImporting?: boolean;
}

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

const SUPPORTED_HINT =
  'PDF, Word (.docx), Markdown, HTML, JSON knowledge packs, CSV, YAML, XML, plain text, and more. Up to 40 files per import (10 MB each).';

export const ImportKnowledgeModal: React.FC<ImportKnowledgeModalProps> = ({
  open,
  onClose,
  onImport,
  isImporting,
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState<string | undefined>();
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setFiles([]);
      setError(undefined);
      setDragOver(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  if (!open) return null;

  const addFiles = (fileList: FileList | File[] | null) => {
    if (!fileList?.length) return;
    setError(undefined);
    const incoming = Array.from(fileList);
    setFiles((prev) => {
      const ids = new Set(prev.map(fileKey));
      const merged = [...prev, ...incoming.filter((f) => !ids.has(fileKey(f)))];
      if (merged.length > 40) {
        setError('Maximum 40 files per import');
        return merged.slice(0, 40);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Select at least one file');
      return;
    }
    onImport(files);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <Card className='w-full max-w-lg'>
        <form onSubmit={handleSubmit}>
          <CardHeader className='flex flex-row items-start justify-between space-y-0'>
            <div>
              <CardTitle>Import knowledge</CardTitle>
              <p className='mt-1 text-sm text-text-secondary'>
                Upload one or many documents. The server extracts text and creates documentation (and structured items from JSON packs).
              </p>
            </div>
            <Button type='button' variant='ghost' size='sm' onClick={onClose} aria-label='Close'>
              <X className='h-4 w-4' />
            </Button>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              role='button'
              tabIndex={0}
            >
              <Upload className='mb-2 h-8 w-8 text-text-secondary' />
              <p className='text-sm font-medium text-text'>Drop files here or click to browse</p>
              <p className='mt-2 text-center text-xs text-text-secondary'>{SUPPORTED_HINT}</p>
              <input
                ref={fileInputRef}
                type='file'
                className='hidden'
                multiple
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            <div className='flex items-center justify-between'>
              <p className='text-sm text-text-secondary'>
                {files.length === 0 ? 'No files selected' : `${files.length} file${files.length === 1 ? '' : 's'} selected`}
              </p>
              <Button type='button' variant='outline' size='sm' onClick={() => fileInputRef.current?.click()}>
                <Plus className='mr-1 h-3 w-3' />
                Add more
              </Button>
            </div>

            {files.length > 0 && (
              <ul className='max-h-48 space-y-1 overflow-y-auto text-sm'>
                {files.map((f) => (
                  <li key={fileKey(f)} className='flex items-center justify-between gap-2 rounded bg-surface px-2 py-1'>
                    <span className='truncate text-text' title={f.name}>
                      {f.name}
                      <span className='ml-2 text-xs text-text-secondary'>({(f.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => setFiles((prev) => prev.filter((x) => fileKey(x) !== fileKey(f)))}
                    >
                      <X className='h-3 w-3' />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {error && <p className='text-sm text-error'>{error}</p>}
          </CardContent>
          <CardFooter className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isImporting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isImporting || files.length === 0}>
              {isImporting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Importing {files.length} file{files.length === 1 ? '' : 's'}…
                </>
              ) : (
                `Import ${files.length || ''} file${files.length === 1 ? '' : 's'}`.trim()
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ImportKnowledgeModal;
