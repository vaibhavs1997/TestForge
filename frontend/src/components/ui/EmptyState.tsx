// External libraries
import React from 'react';
import { Inbox } from 'lucide-react';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { Button } from './Button';

// Styles
import { cn } from '../../utils/cn';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Primary action shown in the empty state */
  action?: EmptyStateAction;
  /** Optional secondary action shown next to the primary action */
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 text-text-secondary">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-text-secondary max-w-sm">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button onClick={action.onClick} variant={action.variant}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant={secondaryAction.variant || 'outline'}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;