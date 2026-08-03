// Versioning service functions
import axios from 'axios';
import type { Version, VersionComparison, EntityType } from '../types';

const API_BASE = '/api';

export const versioningService = {
  listVersions: async (projectId: string, entityType?: EntityType, entityId?: string): Promise<Version[]> => {
    const params = new URLSearchParams();
    if (entityType && entityId) {
      params.set('entityType', entityType);
      params.set('entityId', entityId);
    }
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/versions?${params.toString()}`);
    return data.data;
  },

  getVersion: async (versionId: string): Promise<Version> => {
    const { data } = await axios.get(`${API_BASE}/versions/${versionId}`);
    return data.data;
  },

  getEntityVersions: async (projectId: string, entityType: string, entityId: string): Promise<Version[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/versions/${entityType}/${entityId}`);
    return data.data;
  },

  restoreVersion: async (projectId: string, versionId: string): Promise<Version> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/versions/${versionId}/restore`);
    return data.data;
  },

  compareVersions: async (projectId: string, versionId1: string, versionId2: string): Promise<VersionComparison> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/versions/compare/${versionId1}/${versionId2}`);
    return data.data;
  },
};

export default versioningService;