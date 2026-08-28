import React from 'react';
import { cn } from '../../utils/cn';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const PageContainer = ({ children, className }: PageContainerProps) => {
  return (
    <div className={cn('w-full px-4 py-6 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
};

export default PageContainer;
