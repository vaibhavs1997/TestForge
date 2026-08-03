// Plugin hooks
import { useState, useEffect, useCallback } from 'react';
import { pluginService } from '../services';
import type { Plugin, PluginCategory, PluginHealth } from '../types';

export function usePlugins(filters?: { category?: PluginCategory; projectId?: string; enabled?: boolean }) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pluginService.listPlugins(filters);
      setPlugins(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch plugins');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  return { plugins, loading, error, refetch: fetchPlugins };
}

export function usePluginHealth(pluginId: string | null) {
  const [health, setHealth] = useState<PluginHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!pluginId) return;
    setLoading(true);
    try {
      const data = await pluginService.checkHealth(pluginId);
      setHealth(data);
    } catch (err: any) {
      setHealth({ status: 'unhealthy', message: err.message || 'Failed to check health' });
    } finally {
      setLoading(false);
    }
  }, [pluginId]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { health, loading, checkHealth };
}