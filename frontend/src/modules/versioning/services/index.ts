// Versioning service functions
import { apiAxios } from '../../../services/apiAxios';
import type { Version, VersionComparison, EntityType } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const versioningService = {
  listVersions: async (projectId: string, entityType?: EntityType, entityId?: string): Promise<Version[]> => {
    const params = new URLSearchParams();
    if (entityType && entityId) {
      params.set('entityType', entityType);
      params.set('entityId', entityId);
    }
    const { data } = await apiAxios.get(`${API_BASE_URL}/projects/${projectId}/versions?${params.toString()}`);
    return data.data;
  },

  getVersion: async (versionId: string): Promise<Version> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/versions/${versionId}`);
    return data.data;
  },

  getEntityVersions: async (projectId: string, entityType: string, entityId: string): Promise<Version[]> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/versions/entities/${entityType}/${entityId}`);
    return data.data;
  },

  restoreVersion: async (projectId: string, versionId: string): Promise<Version> => {
    const { data } = await apiAxios.post(`${API_BASE_URL}/versions/${versionId}/restore`);
    return data.data;
  },

  deleteVersion: async (projectId: string, versionId: string): Promise<void> => {
    await apiAxios.delete(`${API_BASE_URL}/versions/${versionId}`);
  },

  compareVersions: async (projectId: string, versionId1: string, versionId2: string): Promise<VersionComparison> => {
    const { data } = await apiAxios.get(`${API_BASE_URL}/versions/compare/${versionId1}/${versionId2}`);
    return data.data;
  },
};

export default versioningService;
