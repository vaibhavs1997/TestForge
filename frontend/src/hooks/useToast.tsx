// Shared toast hook for consistent success/error feedback
import React from 'react';
import { Toast } from '../components/shared/Toast';
import type { ToastType } from '../components/shared/Toast';

export interface ToastState {
  open: boolean;
  message: string;
  type: ToastType;
}

export interface UseToastResult {
  toast: React.ReactNode;
  showToast: (message: string, type?: ToastType) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

export const useToast = (): UseToastResult => {
  const [state, setState] = React.useState<ToastState>({
    open: false,
    message: '',
    type: 'success',
  });

  const showToast = React.useCallback((message: string, type: ToastType = 'success') => {
    setState({ open: true, message, type });
  }, []);

  const showSuccess = React.useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = React.useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const showWarning = React.useCallback((message: string) => {
    showToast(message, 'warning');
  }, [showToast]);

  const showInfo = React.useCallback((message: string) => {
    showToast(message, 'info');
  }, [showToast]);

  const handleClose = React.useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const toast = (
    <Toast
      message={state.message}
      open={state.open}
      onClose={handleClose}
      type={state.type}
    />
  );

  return { toast, showToast, showSuccess, showError, showWarning, showInfo };
};

export default useToast;