import React from 'react';
import { Button } from '../ui/Button';
import { Download, FileDown, ChevronDown } from 'lucide-react';

export interface ReportExportMenuProps {
  onExportHtml: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}

export const ReportExportMenu: React.FC<ReportExportMenuProps> = ({
  onExportHtml,
  onExportJson,
  onExportCsv,
  onExportPdf,
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="relative w-[180px]" ref={ref}>
      <Button
        variant="default"
        size="md"
        className="w-full gap-2 shadow-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown className="ml-1 h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-xl" role="menu">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-muted"
            onClick={() => {
              onExportHtml();
              setOpen(false);
            }}
          >
            <FileDown className="h-4 w-4" />
            Interactive HTML
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-muted"
            onClick={() => {
              onExportJson();
              setOpen(false);
            }}
          >
            <Download className="h-4 w-4" />
            JSON
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-muted"
            onClick={() => {
              onExportCsv();
              setOpen(false);
            }}
          >
            <FileDown className="h-4 w-4" />
            CSV summary
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-muted"
            onClick={() => {
              onExportPdf();
              setOpen(false);
            }}
          >
            <FileDown className="h-4 w-4" />
            Preview / download PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportExportMenu;
