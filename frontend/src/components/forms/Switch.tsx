// External libraries
import React, { forwardRef } from 'react';
// Styles
import { cn } from '../../utils/cn';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, id, checked, ...props }, ref) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex items-center gap-2">
        <input
          id={switchId}
          ref={ref}
          type="checkbox"
          checked={checked}
          className={cn(
            'peer h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-border bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-primary checked:border-primary',
            'after:block after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:translate-x-0 checked:after:translate-x-4',
            className
          )}
          role="switch"
          aria-checked={checked}
          {...props}
        />
        {label && (
          <label htmlFor={switchId} className="text-sm text-text cursor-pointer">
            {label}
          </label>
        )}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
export default Switch;