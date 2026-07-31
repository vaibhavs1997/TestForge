import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface JsonViewerProps {
  data: unknown;
  collapsed?: boolean;
  className?: string;
}

export const JsonViewer = ({ data, collapsed = false, className }: JsonViewerProps) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={cn('rounded-lg border border-border bg-surface', className)}>
      <div className='flex items-center justify-between border-b border-border px-4 py-2'>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className='flex items-center gap-2 text-sm text-text'>
          {isCollapsed ? <ChevronRight className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
          JSON
        </button>
        <Button variant='ghost' size='sm' onClick={handleCopy}>
          {copied ? <Check className='h-4 w-4 text-success' /> : <Copy className='h-4 w-4' />}
        </Button>
      </div>
      {!isCollapsed && (
        <pre className='overflow-x-auto p-4 text-sm text-text'>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default JsonViewer;
