import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageContainer } from '../layout/PageContainer';
import { EmptyState, type EmptyStateAction } from '../ui/EmptyState';
import { ErrorAlert } from './ErrorAlert';
import { Spinner } from '../ui/Spinner';
import { cn } from '../../utils/cn';

export interface PageLoadingProps {
  title?: string;
  message?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  title = 'Loading...',
  message,
  className,
}) => {
  return (
    <PageContainer className={cn('flex min-h-[45vh] items-center justify-center', className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <Spinner size="lg" />
        <div>
          <h2 className="text-lg font-semibold text-text">{title}</h2>
          {message && <p className="mt-1 text-sm text-text-secondary">{message}</p>}
        </div>
      </div>
    </PageContainer>
  );
};

export interface PageErrorProps {
  title: string;
  message?: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const PageError: React.FC<PageErrorProps> = ({
  title,
  message,
  details,
  onRetry,
  onDismiss,
  className,
}) => {
  return (
    <PageContainer className={cn('py-8', className)}>
      <ErrorAlert
        title={title}
        message={message}
        details={details}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />
    </PageContainer>
  );
};

export interface PageEmptyProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  icon?: React.ReactNode;
  iconLabel?: string;
  className?: string;
}

export const PageEmpty: React.FC<PageEmptyProps> = ({
  title,
  description,
  action,
  secondaryAction,
  icon,
  iconLabel,
  className,
}) => {
  return (
    <div className={cn('flex min-h-[28vh] items-center justify-center py-8', className)}>
      <EmptyState
        icon={icon ?? <AlertTriangle className="h-12 w-12" />}
        iconLabel={iconLabel}
        title={title}
        description={description}
        action={action}
        secondaryAction={secondaryAction}
      />
    </div>
  );
};
