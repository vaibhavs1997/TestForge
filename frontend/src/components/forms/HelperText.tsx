import React from 'react';
import { cn } from '../../utils/cn';

export interface HelperTextProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
}

/** Secondary hint below a field; pair with `aria-describedby` on the control. */
export const HelperText: React.FC<HelperTextProps> = ({ id, children, className }) => (
  <p id={id} className={cn('text-sm text-text-secondary', className)}>
    {children}
  </p>
);

export default HelperText;
