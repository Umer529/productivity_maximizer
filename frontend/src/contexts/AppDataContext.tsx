import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { taskService, Task } from '../services/taskService';
import { analyticsService, AnalyticsOverview, AIInsight } from '../services/analyticsService';
import { useAuth } from './AuthContext';

const STALE_MS = 5 * 60 * 1000; // 5 minutes

interface AppDataContextValue {
  tasks: Task[];
  analyticsOverview: AnalyticsOverview | null;
  aiInsights: AIInsight[];
  loadTasks: (force?: boolean) => Promise<void>;
  loadAnalytics: (force?: boolean) => Promise<void>;
  invalidateTaskCache: () => void;
  invalidateAnalyticsCache: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

  // Timestamps track when data was last fetched; 0 means cache is invalid
  const taskFetchedAt = useRef<number>(0);
  const analyticsFetchedAt = useRef<number>(0);
  const prevUserId = useRef<string | null>(null);

  // Clear all caches when user changes (login / logout)
  useEffect(() => {
    const userId = user ? String((user as any).id ?? (user as any)._id ?? '') : null;
    if (userId !== prevUserId.current) {
      taskFetchedAt.current = 0;
      analyticsFetchedAt.current = 0;
      setTasks([]);
      setAnalyticsOverview(null);
      setAiInsights([]);
      prevUserId.current = userId;
    }
  }, [user]);

  const loadTasks = useCallback(async (force = false) => {
    if (!user) return;
    const now = Date.now();
    if (!force && now - taskFetchedAt.current < STALE_MS) return;
    try {
      const res = await taskService.getTasks();
      taskFetchedAt.current = Date.now();
      setTasks(res.data);
    } catch {
      // keep stale data on network error
    }
  }, [user]);

  const loadAnalytics = useCallback(async (force = false) => {
    if (!user) return;
    const now = Date.now();
    if (!force && now - analyticsFetchedAt.current < STALE_MS) return;
    try {
      const [ovRes, insRes] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getInsights(),
      ]);
      analyticsFetchedAt.current = Date.now();
      setAnalyticsOverview(ovRes.data);
      setAiInsights(insRes.data || []);
    } catch {
      // keep stale data on network error
    }
  }, [user]);

  const invalidateTaskCache = useCallback(() => {
    taskFetchedAt.current = 0;
  }, []);

  const invalidateAnalyticsCache = useCallback(() => {
    analyticsFetchedAt.current = 0;
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        tasks,
        analyticsOverview,
        aiInsights,
        loadTasks,
        loadAnalytics,
        invalidateTaskCache,
        invalidateAnalyticsCache,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
};
