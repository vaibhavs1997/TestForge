// External libraries
import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  width?: string;
}

export interface VirtualizedTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  skeletonRows?: number;
  className?: string;
  /** Estimated total count for virtualization */
  totalCount?: number;
  /** Row height in pixels (default 50) */
  rowHeight?: number;
  /** Overscan count (default 5) */
  overscan?: number;
}

/**
 * Virtualized data table for large datasets.
 * Only renders visible rows + overscan for optimal performance.
 */
export function VirtualizedTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  skeletonRows = 5,
  className,
  totalCount,
  rowHeight = 50,
  overscan = 5,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: totalCount ?? data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

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

  if (!data.length && !totalCount) {
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
    <div className={cn('rounded-lg border border-border', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider', col.className)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((virtualRow) => {
              const row = data[virtualRow.index];
              if (!row) return null;
              return (
                <tr
                  key={virtualRow.key}
                  className="hover:bg-surface/50 transition-colors"
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-text', col.className)}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalCount && totalCount > data.length && (
        <div className="px-4 py-2 text-xs text-text-secondary border-t border-border">
          Showing {data.length} of {totalCount.toLocaleString()} items
        </div>
      )}
    </div>
  );
}

export default VirtualizedTable;