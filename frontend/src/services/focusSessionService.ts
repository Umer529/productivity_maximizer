import { api } from '../lib/apiClient';

export interface FocusSession {
  _id: string;
  userId: string;
  taskId?: string;
  taskTitle?: string;
  startTime: string;
  endTime?: string;
  plannedDuration: number;
  actualDuration?: number;
  completed: boolean;
  interrupted: boolean;
  interruptionCount: number;
  sessionType: 'study' | 'revision' | 'break' | 'prayer';
  notes?: string;
}

export const focusSessionService = {
  startSession: async (payload: {
    taskId?: string;
    taskTitle?: string;
    plannedDuration: number;
    sessionType?: FocusSession['sessionType'];
  }): Promise<{ success: boolean; data: FocusSession }> => {
    return api.post('/focus-sessions/start', payload);
  },

  endSession: async (
    id: string,
    payload: {
      taskProgress?: number;
      notes?: string;
      interrupted?: boolean;
      completed?: boolean;
      actualDuration?: number;
    },
  ): Promise<{ success: boolean; data: FocusSession }> => {
    return api.put(`/focus-sessions/${id}/end`, payload);
  },

  getActiveSession: async (): Promise<{ success: boolean; data: FocusSession | null }> => {
    return api.get('/focus-sessions/active');
  },

  getSessions: async (params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ success: boolean; data: FocusSession[] }> => {
    return api.get('/focus-sessions', params as Record<string, string | number>);
  },
};
