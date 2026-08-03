// Notification hooks
import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '../services';
import type { Notification, Provider } from '../types';

export function useNotifications(projectId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.listNotifications(projectId);
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return { notifications, loading, error, refetch: fetchNotifications };
}

export function useProviders(projectId: string | null) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.listProviders(projectId);
      setProviders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return { providers, loading, error, refetch: fetchProviders };
}