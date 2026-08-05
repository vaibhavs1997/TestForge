// Scheduler service functions
import axios from 'axios';
import type { Schedule, ScheduleFormData } from '../types';
import { API_BASE_URL } from '../../../constants/api';

export const scheduleService = {
  listSchedules: async (projectId: string): Promise<Schedule[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/schedules`);
    return data.data;
  },

  getSchedule: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    const { data } = await axios.get(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}`);
    return data.data;
  },

  createSchedule: async (projectId: string, payload: ScheduleFormData): Promise<Schedule> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/schedules`, payload);
    return data.data;
  },

  updateSchedule: async (projectId: string, scheduleId: string, payload: Partial<ScheduleFormData>): Promise<Schedule> => {
    const { data } = await axios.patch(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}`, payload);
    return data.data;
  },

  deleteSchedule: async (projectId: string, scheduleId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}`);
  },

  runNow: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}/run`);
    return data.data;
  },

  enableSchedule: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}/enable`);
    return data.data;
  },

  disableSchedule: async (projectId: string, scheduleId: string): Promise<Schedule> => {
    const { data } = await axios.post(`${API_BASE_URL}/projects/${projectId}/schedules/${scheduleId}/disable`);
    return data.data;
  },
};

export default scheduleService;