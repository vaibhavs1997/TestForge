// External libraries
import React from 'react';
import { Inbox } from 'lucide-react';
// Styles
import { cn } from '../../utils/cn';
// Components
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  /** Contextual empty-state message explaining why nothing is shown */
  emptyTitle?: string;
  /** Guidance on what to do next */
  emptyDescription?: string;
  /** Optional primary action shown when the table is empty */
  emptyAction?: { label: string; onClick: () => void };
  /** Number of skeleton rows to render while loading */
  skeletonRows?: number;
  className?: string;
}

/**
 * Consistent data table with:
 * - Standardized header row
 * - Skeleton loading rows
 * - Contextual empty state (title + explanation + optional action)
 */
export function DataTable<T extends Record<string, unknown>>({
  columns, data, loading, emptyTitle = 'No data found', emptyDescription, emptyAction, skeletonRows = 5, className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.className)}>
                    <Skeleton className="h-4 w-full max-w-[140px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center', className)}>
        <Inbox className="mb-3 h-10 w-10 text-text-secondary" />
        <h3 className="text-base font-semibold text-text">{emptyTitle}</h3>
        {emptyDescription && (
          <p className="mt-1 max-w-sm text-sm text-text-secondary">{emptyDescription}</p>
        )}
        {emptyAction && (
          <Button onClick={emptyAction.onClick} className="mt-4">
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn('px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider', col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-surface/50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-text', col.className)}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;