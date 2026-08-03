// Audit Log service functions
import axios from 'axios';
import type { AuditLog, AuditLogFilters, AuditModule, AuditAction } from '../types';

const API_BASE = '/api';

export const auditService = {
  getAuditLogs: async (projectId: string, filters?: AuditLogFilters): Promise<AuditLog[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.module) params.set('module', filters.module);
      if (filters.entityType) params.set('entityType', filters.entityType);
      if (filters.entityId) params.set('entityId', filters.entityId);
      if (filters.action) params.set('action', filters.action);
      if (filters.startDate) params.set('startDate', filters.startDate.toString());
      if (filters.endDate) params.set('endDate', filters.endDate.toString());
    }
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/audit?${params.toString()}`);
    return data.data;
  },

  getAuditLog: async (logId: string): Promise<AuditLog> => {
    const { data } = await axios.get(`${API_BASE}/audit/${logId}`);
    return data.data;
  },
};

export default auditService;