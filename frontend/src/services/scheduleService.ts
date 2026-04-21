import { api } from '../lib/apiClient';

export interface ScheduleSlot {
  time: string;
  task: string;
  type: 'study' | 'break' | 'prayer' | 'meal' | 'revision';
  duration: number;
  course?: string;
  taskId?: string;
  color?: string;
}

export const scheduleService = {
  getSchedule: async (date?: string): Promise<{ success: boolean; data: ScheduleSlot[] }> => {
    const res = await api.get<{
      success: boolean;
      data: { date: string; slots: ScheduleSlot[] };
    }>('/schedule', date ? { date } : undefined);
    return { success: res.success, data: res.data?.slots ?? [] };
  },

  getWeeklySchedule: async (): Promise<{
    success: boolean;
    data: Record<string, ScheduleSlot[]>;
  }> => {
    return api.get('/schedule/weekly');
  },

  regenerate: async (date?: string): Promise<{ success: boolean; data: ScheduleSlot[] }> => {
    const res = await api.post<{
      success: boolean;
      data: { date: string; slots: ScheduleSlot[] };
    }>('/schedule/regenerate', date ? { date } : {});
    return { success: res.success, data: res.data?.slots ?? [] };
  },
};
