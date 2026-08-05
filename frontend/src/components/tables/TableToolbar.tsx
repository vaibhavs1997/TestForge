import React from 'react';
import { cn } from '../../utils/cn';

export interface TableToolbarProps {
  /** Left-aligned content (usually search input) */
  left?: React.ReactNode;
  /** Right-aligned content (usually filters and actions) */
  right?: React.ReactNode;
  /** Fallback for children-based usage */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Consistent table toolbar with standardized layout:
 * - Left side for search
 * - Right side for filters and actions
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({ left, right, children, className }) => {
  if (children) {
    return (
      <div className={cn('flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between', className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between', className)}>
      {left && <div className="flex flex-1 items-center">{left}</div>}
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
};

export default TableToolbar;