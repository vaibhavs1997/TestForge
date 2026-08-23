// Notification service functions
import type { Notification, NotificationFormData, Provider } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

export const notificationService = {
  listNotifications: async (projectId: string): Promise<Notification[]> => {
    return apiRequest.get<Notification[]>(`${API_BASE_URL}/projects/${projectId}/notifications`);
  },

  getNotification: async (notificationId: string): Promise<Notification> => {
    return apiRequest.get<Notification>(`${API_BASE_URL}/notifications/${notificationId}`);
  },

  createNotification: async (projectId: string, payload: NotificationFormData): Promise<Notification> => {
    return apiRequest.post<Notification>(`${API_BASE_URL}/projects/${projectId}/notifications`, payload);
  },

  updateNotification: async (notificationId: string, payload: Partial<NotificationFormData>): Promise<Notification> => {
    return apiRequest.put<Notification>(`${API_BASE_URL}/notifications/${notificationId}`, payload);
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiRequest.delete(`${API_BASE_URL}/notifications/${notificationId}`);
  },

  testNotification: async (notificationId: string): Promise<void> => {
    await apiRequest.post(`${API_BASE_URL}/notifications/${notificationId}/test`);
  },

  listProviders: async (projectId: string): Promise<Provider[]> => {
    return apiRequest.get<Provider[]>(`${API_BASE_URL}/projects/${projectId}/providers`);
  },
};

export default notificationService;
