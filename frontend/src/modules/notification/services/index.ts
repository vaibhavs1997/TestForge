// Notification service functions
import axios from 'axios';
import type { Notification, NotificationFormData, Provider } from '../types';

const API_BASE = '/api';

export const notificationService = {
  listNotifications: async (projectId: string): Promise<Notification[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/notifications`);
    return data.data;
  },

  getNotification: async (notificationId: string): Promise<Notification> => {
    const { data } = await axios.get(`${API_BASE}/notifications/${notificationId}`);
    return data.data;
  },

  createNotification: async (projectId: string, payload: NotificationFormData): Promise<Notification> => {
    const { data } = await axios.post(`${API_BASE}/projects/${projectId}/notifications`, payload);
    return data.data;
  },

  updateNotification: async (notificationId: string, payload: Partial<NotificationFormData>): Promise<Notification> => {
    const { data } = await axios.put(`${API_BASE}/notifications/${notificationId}`, payload);
    return data.data;
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await axios.delete(`${API_BASE}/notifications/${notificationId}`);
  },

  testNotification: async (notificationId: string): Promise<void> => {
    await axios.post(`${API_BASE}/notifications/${notificationId}/test`);
  },

  listProviders: async (projectId: string): Promise<Provider[]> => {
    const { data } = await axios.get(`${API_BASE}/projects/${projectId}/providers`);
    return data.data;
  },
};

export default notificationService;