// Simple toast notification component.
import React from 'react';
import { CheckCircle, X, Info, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { TOAST_DURATION_MS } from '../../constants/timeouts';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  duration?: number;
  type?: ToastType;
  /** Where the toast is anchored on the viewport. */
  position?: 'bottom-right' | 'top-right' | 'top-center';
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className='h-5 w-5 text-green-600' />,
  warning: <AlertTriangle className='h-5 w-5 text-warning' />,
  error: <AlertCircle className='h-5 w-5 text-red-600' />,
  info: <Info className='h-5 w-5 text-blue-600' />,
};

const positionClasses: Record<NonNullable<ToastProps['position']>, string> = {
  'bottom-right': 'bottom-4 right-4 slide-in-from-bottom-2',
  'top-right': 'top-4 right-4 slide-in-from-top-2',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 slide-in-from-top-2',
};

export const Toast = ({
  message,
  open,
  onClose,
  duration = TOAST_DURATION_MS,
  type = 'success',
  position = 'top-right',
}: ToastProps) => {
  React.useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  const Icon = iconMap[type];

  return (
    <div
      className={cn(
        'fixed z-[60] animate-in fade-in',
        positionClasses[position],
      )}
    >
      <div
        className={cn(
          'flex max-h-[min(70vh,28rem)] max-w-lg items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg',
        )}
      >
        <div className='flex-shrink-0 pt-0.5'>
          {Icon}
        </div>
        <p className='min-w-0 flex-1 overflow-y-auto text-sm font-medium text-text whitespace-pre-wrap break-words'>
          {message}
        </p>
        <button
          onClick={onClose}
          className='ml-2 flex-shrink-0 text-text-secondary hover:text-text'
          aria-label='Close toast'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
};

export default Toast;
