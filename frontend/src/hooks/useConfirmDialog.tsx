// Shared confirm dialog hook for consistent destructive action confirmation
import React from 'react';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}

export interface UseConfirmDialogResult {
  confirmDialog: React.ReactNode;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

export const useConfirmDialog = (): UseConfirmDialogResult => {
  const [options, setOptions] = React.useState<ConfirmDialogOptions | null>(null);
  const [open, setOpen] = React.useState(false);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((opts: ConfirmDialogOptions): Promise<boolean> => {
    setOptions(opts);
    setOpen(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    setOpen(false);
    resolverRef.current?.(true);
    resolverRef.current = null;
  }, []);

  const handleCancel = React.useCallback(() => {
    setOpen(false);
    resolverRef.current?.(false);
    resolverRef.current = null;
  }, []);

  const confirmDialog = options ? (
    <ConfirmDialog
      open={open}
      title={options.title}
      message={options.message}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      variant={options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirmDialog, confirm };
};

export default useConfirmDialog;