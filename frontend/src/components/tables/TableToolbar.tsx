import React from 'react';
import { cn } from '../../utils/cn';

export interface TableToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({ children, className }) => {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-2', className)}>
      {children}
    </div>
  );
};

export default TableToolbar;