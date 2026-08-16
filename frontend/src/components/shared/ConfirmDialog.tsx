import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../utils/cn';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Consistent confirmation dialog.
 *
 * Ordering: Cancel (left) -> Confirm (right).
 * Cancels always use the outline variant; the primary action is always rightmost.
 */
export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management and escape key handling
  useEffect(() => {
    if (!open) return;

    // Store the previously focused element for restoration
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus the cancel button by default (safe default for destructive actions)
    const timer = setTimeout(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>('[data-confirm-cancel]')
        ?.focus();
    }, 50);

    // Handle Escape key and focus trapping
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      role='dialog'
      aria-modal='true'
      aria-labelledby='confirm-dialog-title'
      aria-describedby='confirm-dialog-message'
      onClick={onCancel}
    >
      <div ref={dialogRef} className='mx-4 w-full max-w-md' role='document' onClick={(event) => event.stopPropagation()}>
        <Card>
          <CardHeader>
            <div className='flex items-center gap-3'>
              <div className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                variant === 'destructive' ? 'bg-red-100 dark:bg-red-900' : 'bg-primary/10'
              )}>
                <AlertTriangle className={cn('h-5 w-5', variant === 'destructive' ? 'text-error' : 'text-primary')} />
              </div>
              <CardTitle id='confirm-dialog-title'>{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <p id='confirm-dialog-message' className='text-sm text-text-secondary'>{message}</p>
          </CardContent>
          <CardFooter className='justify-end gap-2 border-t border-border px-6 py-4'>
            <Button
              data-confirm-cancel
              variant='outline'
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              data-confirm-ok
              variant={variant === 'destructive' ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={isLoading}
              loading={isLoading}
            >
              {isLoading ? 'Loading...' : confirmLabel}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmDialog;
