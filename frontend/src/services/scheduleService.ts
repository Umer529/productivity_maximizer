import { api } from '../lib/apiClient';

export interface ScheduleSlot {
  time: string;
  task: string;
  type: 'study' | 'break' | 'prayer' | 'meal' | 'revision';
  duration: number;
  course?: string;
  taskId?: string;
  color?: string;
  activity?: string;
  priority?: number;
  difficulty?: number;
}

export interface ScheduleData {
  date: string;
  slots: ScheduleSlot[];
  student_name?: string;
  student_productivity?: number;
  recommended_study_hours?: number;
  analytics?: any;
  method?: string;
}

export const scheduleService = {
  getSchedule: async (date?: string, method: 'ml' | 'heuristic' = 'ml'): Promise<{ success: boolean; data: ScheduleData }> => {
    const res = await api.get<{
      success: boolean;
      data: ScheduleData;
    }>('/schedule', { ...(date ? { date } : {}), method });
    return res;
  },

  getWeeklySchedule: async (method: 'ml' | 'heuristic' = 'ml'): Promise<{
    success: boolean;
    data: ScheduleData[];
  }> => {
    return api.get('/schedule/weekly', { method });
  },

  regenerate: async (date?: string, method: 'ml' | 'heuristic' = 'ml'): Promise<{ success: boolean; data: ScheduleData }> => {
    const res = await api.post<{
      success: boolean;
      data: ScheduleData;
    }>('/schedule/regenerate', { ...(date ? { date } : {}), method });
    return res;
  },
};
