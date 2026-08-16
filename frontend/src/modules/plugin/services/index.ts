// Plugin service functions
import type { Plugin, PluginCategory, PluginHealth } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

export const pluginService = {
  listPlugins: async (filters?: { category?: PluginCategory; projectId?: string; enabled?: boolean }): Promise<Plugin[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.category) params.set('category', filters.category);
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.enabled !== undefined) params.set('enabled', filters.enabled.toString());
    }
    return apiRequest.get<Plugin[]>(`${API_BASE_URL}/plugins?${params.toString()}`);
  },

  getPlugin: async (pluginId: string): Promise<Plugin> => {
    return apiRequest.get<Plugin>(`${API_BASE_URL}/plugins/${pluginId}`);
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
    return apiRequest.post<Plugin>(`${API_BASE_URL}/plugins`, plugin);
  },

  enablePlugin: async (pluginId: string): Promise<Plugin> => {
    return apiRequest.post<Plugin>(`${API_BASE_URL}/plugins/${pluginId}/enable`);
  },

  disablePlugin: async (pluginId: string): Promise<Plugin> => {
    return apiRequest.post<Plugin>(`${API_BASE_URL}/plugins/${pluginId}/disable`);
  },

  updateConfiguration: async (pluginId: string, configuration: Record<string, any>): Promise<Plugin> => {
    return apiRequest.patch<Plugin>(`${API_BASE_URL}/plugins/${pluginId}/configuration`, { configuration });
  },

  deletePlugin: async (pluginId: string): Promise<void> => {
    await apiRequest.delete(`${API_BASE_URL}/plugins/${pluginId}`);
  },

  checkHealth: async (pluginId: string): Promise<PluginHealth> => {
    return apiRequest.get<PluginHealth>(`${API_BASE_URL}/plugins/${pluginId}/health`);
  },

  resolveByCategoryAndCapability: async (category: string, capability: string): Promise<Plugin[]> => {
    return apiRequest.get<Plugin[]>(`${API_BASE_URL}/plugins/resolve/${category}/${capability}`);
  },
};

export default pluginService;
