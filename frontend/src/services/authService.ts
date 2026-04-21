import { api, setToken, clearToken } from '../lib/apiClient';

export interface UserPreferences {
  cgpaTarget: number;
  semester: number;
  studyHoursPerDay: number;
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  longBreakAfter: number;
  namazBreaksEnabled: boolean;
  sleepStart: string;
  sleepEnd: string;
  studyStartTime: string;
  studyEndTime: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  streak: number;
  totalStudyMinutes: number;
  preferences: UserPreferences;
}

interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

export const authService = {
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password });
    await setToken(res.token);
    return res;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    await setToken(res.token);
    return res;
  },

  logout: async (): Promise<void> => {
    await clearToken();
  },

  getMe: async (): Promise<{ success: boolean; data: AuthUser }> => {
    return api.get('/auth/me');
  },
};
