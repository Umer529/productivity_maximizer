import { api } from '../lib/apiClient';

export interface Task {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'assignment' | 'quiz' | 'midterm' | 'final' | 'project' | 'other';
  course?: string;
  deadline: string;
  difficulty: number;
  estimatedDuration: number;
  actualDuration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  urgencyScore: number;
  progress: number;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byType: Record<string, number>;
  completionRate: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  type?: Task['type'];
  course?: string;
  deadline: string;
  difficulty?: number;
  estimatedDuration?: number;
  notes?: string;
  tags?: string[];
}

export const taskService = {
  getTasks: async (filters?: {
    status?: string;
    type?: string;
    course?: string;
    priority?: string;
  }): Promise<{ success: boolean; count: number; data: Task[] }> => {
    return api.get('/tasks', filters as Record<string, string>);
  },

  getTask: async (id: string): Promise<{ success: boolean; data: Task }> => {
    return api.get(`/tasks/${id}`);
  },

  createTask: async (payload: CreateTaskPayload): Promise<{ success: boolean; data: Task }> => {
    return api.post('/tasks', payload);
  },

  updateTask: async (
    id: string,
    payload: Partial<CreateTaskPayload>,
  ): Promise<{ success: boolean; data: Task }> => {
    return api.put(`/tasks/${id}`, payload);
  },

  deleteTask: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.delete(`/tasks/${id}`);
  },

  updateProgress: async (
    id: string,
    progress: number,
  ): Promise<{ success: boolean; data: Task }> => {
    return api.patch(`/tasks/${id}/progress`, { progress });
  },

  getStats: async (): Promise<{ success: boolean; data: TaskStats }> => {
    return api.get('/tasks/stats');
  },
};
