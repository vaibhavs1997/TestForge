// Plugin service functions
import axios from 'axios';
import type { Plugin, PluginCategory, PluginHealth } from '../types';

const API_BASE = '/api';

export const pluginService = {
  listPlugins: async (filters?: { category?: PluginCategory; projectId?: string; enabled?: boolean }): Promise<Plugin[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.category) params.set('category', filters.category);
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.enabled !== undefined) params.set('enabled', filters.enabled.toString());
    }
    const { data } = await axios.get(`${API_BASE}/plugins?${params.toString()}`);
    return data.data;
  },

  getPlugin: async (pluginId: string): Promise<Plugin> => {
    const { data } = await axios.get(`${API_BASE}/plugins/${pluginId}`);
    return data.data;
  },

  createPlugin: async (plugin: {
    name: string;
    version: string;
    author: string;
    category: PluginCategory;
    capabilities: any[];
    configuration: Record<string, any>;
    enabled?: boolean;
    projectId?: string | null;
  }): Promise<Plugin> => {
    const { data } = await axios.post(`${API_BASE}/plugins`, plugin);
    return data.data;
  },

  enablePlugin: async (pluginId: string): Promise<Plugin> => {
    const { data } = await axios.post(`${API_BASE}/plugins/${pluginId}/enable`);
    return data.data;
  },

  disablePlugin: async (pluginId: string): Promise<Plugin> => {
    const { data } = await axios.post(`${API_BASE}/plugins/${pluginId}/disable`);
    return data.data;
  },

  updateConfiguration: async (pluginId: string, configuration: Record<string, any>): Promise<Plugin> => {
    const { data } = await axios.patch(`${API_BASE}/plugins/${pluginId}/configuration`, { configuration });
    return data.data;
  },

  deletePlugin: async (pluginId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/plugins/${pluginId}`);
  },

  checkHealth: async (pluginId: string): Promise<PluginHealth> => {
    const { data } = await axios.get(`${API_BASE}/plugins/${pluginId}/health`);
    return data.data;
  },

  resolveByCategoryAndCapability: async (category: string, capability: string): Promise<Plugin[]> => {
    const { data } = await axios.get(`${API_BASE}/plugins/resolve/${category}/${capability}`);
    return data.data;
  },
};

export default pluginService;