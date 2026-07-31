import React from 'react';
import { cn } from '../../utils/cn';

export interface PageActionsProps {
  children: React.ReactNode;
  className?: string;
}

export const PageActions = ({ children, className }: PageActionsProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  );
};

export default PageActions;
