import React from 'react';
import { cn } from '../../utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, children, className }: PageHeaderProps) => {
  return (
    <div className={cn('mb-6', className)}>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>{title}</h1>
          {description && <p className='mt-1 text-sm text-text-secondary'>{description}</p>}
        </div>
        {children && <div className='flex items-center gap-2'>{children}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
