import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface ColumnVisibilityProps {
  columns: { key: string; label: string }[];
  visibleColumns: string[];
  onToggle: (key: string) => void;
  className?: string;
}

export const ColumnVisibility: React.FC<ColumnVisibilityProps> = ({ columns, visibleColumns, onToggle, className }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Eye className="mr-2 h-4 w-4" />
        Columns
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-background shadow-lg">
          <div className="p-2">
            {columns.map((col) => (
              <label key={col.key} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface cursor-pointer">
                <input type="checkbox" checked={visibleColumns.includes(col.key)} onChange={() => onToggle(col.key)} className="rounded border-border" />
                {col.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnVisibility;