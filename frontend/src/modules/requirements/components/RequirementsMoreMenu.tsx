import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Sparkles, RefreshCw, Upload } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface RequirementsMoreMenuProps {
  onReanalyze: () => void;
  isAnalyzing: boolean;
  onGenerateFromAnalysis?: () => void;
  isGeneratingFromAnalysis?: boolean;
  showGenerateFromAnalysis: boolean;
  onGenerateWithAI: () => void;
  onImportJson: () => void;
}

export const RequirementsMoreMenu: React.FC<RequirementsMoreMenuProps> = ({
  onReanalyze,
  isAnalyzing,
  onGenerateFromAnalysis,
  isGeneratingFromAnalysis,
  showGenerateFromAnalysis,
  onGenerateWithAI,
  onImportJson,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className='relative flex flex-wrap items-center gap-2' ref={ref}>
      <Button
        variant='outline'
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup='menu'
        aria-label='More requirement actions'
      >
        More
        <ChevronDown className='ml-2 h-4 w-4' aria-hidden />
      </Button>
      {open && (
        <div
          className='absolute right-0 top-full z-20 mt-1 min-w-[220px] rounded-lg border border-border bg-background py-1 shadow-lg'
          role='menu'
          aria-label='More requirement actions'
        >
          <button
            type='button'
            className='flex w-full items-center px-3 py-2 text-left text-sm hover:bg-surface'
            onClick={() => {
              onReanalyze();
              setOpen(false);
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} aria-hidden />
            {isAnalyzing ? 'Analyzing…' : 'Re-analyze project'}
          </button>
          {showGenerateFromAnalysis && onGenerateFromAnalysis && (
            <button
              type='button'
              className='flex w-full items-center px-3 py-2 text-left text-sm hover:bg-surface'
              onClick={() => {
                onGenerateFromAnalysis();
                setOpen(false);
              }}
              disabled={isGeneratingFromAnalysis}
            >
              <Sparkles className='mr-2 h-4 w-4' aria-hidden />
              Generate from analysis
            </button>
          )}
          <button
            type='button'
            className='flex w-full items-center px-3 py-2 text-left text-sm hover:bg-surface'
            onClick={() => {
              onGenerateWithAI();
              setOpen(false);
            }}
          >
            <Sparkles className='mr-2 h-4 w-4' />
            Generate requirements (AI)
          </button>
          <button
            type='button'
            className='flex w-full items-center px-3 py-2 text-left text-sm hover:bg-surface'
            onClick={() => {
              onImportJson();
              setOpen(false);
            }}
          >
            <Upload className='mr-2 h-4 w-4' aria-hidden />
            Import JSON
          </button>
        </div>
      )}
    </div>
  );
};

export default RequirementsMoreMenu;
