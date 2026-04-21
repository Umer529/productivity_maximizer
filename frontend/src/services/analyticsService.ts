import { api } from '../lib/apiClient';

export interface AnalyticsOverview {
  focusScore: number;
  totalFocusMinutes: number;
  streak: number;
  tasksCompleted: number;
  tasksPending: number;
  weeklyHours: number[];
  subjectBreakdown: { name: string; hours: number; pct: number }[];
}

export interface AIInsight {
  type: 'tip' | 'warning' | 'prediction';
  text: string;
}

export interface StudyHistoryPoint {
  date: string;
  minutes: number;
}

export const analyticsService = {
  getOverview: async (): Promise<{ success: boolean; data: AnalyticsOverview }> => {
    return api.get('/analytics/overview');
  },

  getInsights: async (): Promise<{ success: boolean; data: AIInsight[] }> => {
    return api.get('/analytics/insights');
  },

  getHistory: async (days?: number): Promise<{ success: boolean; data: StudyHistoryPoint[] }> => {
    return api.get('/analytics/history', days ? { days } : undefined);
  },
};
