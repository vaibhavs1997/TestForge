// Scheduler service functions
import type { Schedule, ScheduleFormData } from '../types';
import { API_BASE_URL } from '../../../constants/api';
import { apiRequest } from '../../../services/apiRequest';

export const scheduleService = {
  listSchedules: async (projectId: string): Promise<Schedule[]> => {
    return apiRequest.get<Schedule[]>(`${API_BASE_URL}/projects/${projectId}/schedules`);
  },

  getSchedule: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    return apiRequest.get<Schedule>(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}`);
  },

  createSchedule: async (projectId: string, payload: ScheduleFormData): Promise<Schedule> => {
    return apiRequest.post<Schedule>(`${API_BASE_URL}/projects/${projectId}/schedules`, payload);
  },

  updateSchedule: async (projectId: string, scheduleId: string, payload: Partial<ScheduleFormData>): Promise<Schedule> => {
    return apiRequest.patch<Schedule>(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}`, payload);
  },

  deleteSchedule: async (projectId: string, scheduleId: string): Promise<void> => {
    await apiRequest.delete(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}`);
  },

  runNow: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    return apiRequest.post<Schedule>(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}/run`);
  },

  enableSchedule: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    return apiRequest.post<Schedule>(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}/enable`);
  },

  disableSchedule: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    return apiRequest.post<Schedule>(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}/disable`);
  },
};

export default scheduleService;
