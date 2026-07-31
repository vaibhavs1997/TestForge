import React from 'react';
import { cn } from '../../utils/cn';

export interface SectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Section = ({ title, children, className }: SectionProps) => {
  return (
    <section className={cn('mb-6', className)}>
      {title && <h2 className='mb-4 text-lg font-semibold text-text'>{title}</h2>}
      {children}
    </section>
  );
};

export default Section;
