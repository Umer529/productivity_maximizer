import { api } from '../lib/apiClient';

export interface MLPredictions {
  productivity_score: {
    value: number;
    confidence: number;
  };
  required_hours: {
    value: number;
    confidence: number;
  };
  break_interval: {
    value: number;
    confidence: number;
  };
}

export interface TaskAnalysis {
  productivity_score: {
    value: number;
    confidence: number;
  };
  required_hours: {
    value: number;
    confidence: number;
  };
  break_interval: {
    value: number;
    confidence: number;
  };
  prioritized_tasks: {
    name: string;
    priority_score: number;
    estimated_completion_time: number;
  }[];
}

export const mlService = {
  getPredictions: async (): Promise<{ success: boolean; data: MLPredictions }> => {
    return api.get('/ml/predictions');
  },

  analyzeTasks: async (tasks: any[]): Promise<{ success: boolean; data: TaskAnalysis }> => {
    return api.post('/ml/analyze-tasks', { tasks });
  },
};
