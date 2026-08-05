import React from 'react';
import { cn } from '../../utils/cn';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional breadcrumb trail rendered above the title */
  breadcrumb?: BreadcrumbItem[];
  /** Primary and secondary actions */
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, breadcrumb, children, className }: PageHeaderProps) => {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <Breadcrumb items={breadcrumb} className="mb-3" />
      )}
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-text'>{title}</h1>
          {description && <p className='mt-1 text-sm text-text-secondary'>{description}</p>}
        </div>
        {children && <div className='flex flex-shrink-0 items-center gap-2'>{children}</div>}
      </div>
    </div>
  );
};

export default PageHeader;