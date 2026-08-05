// External libraries
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

// Shared constants

// Shared types

// Hooks

// Services

// Components

// Styles
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white hover:bg-primary/80',
        secondary: 'border-transparent bg-surface text-text hover:bg-surface/80',
        destructive: 'border-transparent bg-error text-white hover:bg-error/80',
        outline: 'text-text border-border',
        success: 'border-transparent bg-success text-white hover:bg-success/80',
        warning: 'border-transparent bg-warning text-white hover:bg-warning/80',
        // Standardized status variants
        running: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
        pending: 'border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        disabled: 'border-transparent bg-surface text-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge: React.FC<BadgeProps> = ({ className, variant, children, ...props }) => {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </div>
  );
};

export default Badge;