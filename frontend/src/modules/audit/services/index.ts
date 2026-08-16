// Audit Log service functions
import type { AuditLog, AuditLogFilters, AuditModule, AuditAction } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

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
    return apiRequest.get<AuditLog[]>(`${API_BASE_URL}/projects/${projectId}/audit?${params.toString()}`);
  },

  getAuditLog: async (logId: string): Promise<AuditLog> => {
    return apiRequest.get<AuditLog>(`${API_BASE_URL}/audit/${logId}`);
  },
};

export default auditService;
