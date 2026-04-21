import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend URL when running on a real device
// For Android emulator: http://10.0.2.2:5000/api/v1
// For iOS simulator / Expo Go on same machine: http://localhost:5000/api/v1
const BASE_URL = 'http://192.168.0.119:5000/api/v1';
const TOKEN_KEY = 'focusflow_token';

let _tokenCache: string | null = null;

export async function setToken(token: string): Promise<void> {
  _tokenCache = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function loadToken(): Promise<string | null> {
  if (_tokenCache !== null) return _tokenCache;
  const val = await AsyncStorage.getItem(TOKEN_KEY);
  _tokenCache = val;
  return val;
}

export async function clearToken(): Promise<void> {
  _tokenCache = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) query.set(k, String(v));
    }
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await loadToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
