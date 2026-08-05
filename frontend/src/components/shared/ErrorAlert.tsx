// Consistent error presentation component with title, message, optional details, and retry action
import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

export interface ErrorAlertProps {
  title: string;
  message?: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  details,
  onRetry,
  onDismiss,
  className,
}) => {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      className={cn(
        'relative rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950',
        className
      )}
      role='alert'
      aria-live='assertive'
    >
      <div className='flex items-start gap-3'>
        <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400' />
        <div className='flex-1 min-w-0'>
          <h4 className='text-sm font-semibold text-red-800 dark:text-red-200'>{title}</h4>
          {message && (
            <p className='mt-1 text-sm text-red-700 dark:text-red-300'>{message}</p>
          )}
          {details && (
            <div className='mt-2'>
              <button
                type='button'
                onClick={() => setShowDetails((prev) => !prev)}
                className='text-xs font-medium text-red-600 underline hover:text-red-700 dark:text-red-400'
                aria-expanded={showDetails}
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              {showDetails && (
                <pre className='mt-2 max-h-40 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800 dark:bg-red-900 dark:text-red-200'>
                  {details}
                </pre>
              )}
            </div>
          )}
          {(onRetry || onDismiss) && (
            <div className='mt-3 flex items-center gap-2'>
              {onRetry && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={onRetry}
                  className='border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300'
                >
                  <RefreshCw className='mr-1 h-3 w-3' />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={onDismiss}
                  className='text-red-600 hover:bg-red-100 dark:text-red-400'
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            type='button'
            onClick={onDismiss}
            className='flex-shrink-0 rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900'
            aria-label='Dismiss error'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;